"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Scissors, Plus, Edit } from "lucide-react"
import type { Selection } from "@/types/selection"

interface ImageEditorProps {
  imageUrl: string
  originalFilename: string
  selections: Selection[]
  onAddSelection: (selection: Selection) => void
  onUpdateSelection: (index: number, selection: Selection) => void
  onDeleteSelection: (index: number) => void
  onSliceImage: (result: { html: string; files: File[] }) => void
}

export default function ImageEditor({
  imageUrl,
  originalFilename,
  selections,
  onAddSelection,
  onUpdateSelection,
  onDeleteSelection,
  onSliceImage,
}: ImageEditorProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [scaleFactor, setScaleFactor] = useState(1)
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 })

  const CANVAS_WIDTH = 640 // Fixed canvas width

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Function to initialize and resize the canvas
  const setupCanvas = () => {
    if (!imageRef.current || !canvasRef.current) return

    const img = imageRef.current
    const canvas = canvasRef.current

    // Set fixed width and calculate height to maintain aspect ratio
    canvas.width = CANVAS_WIDTH
    const scale = CANVAS_WIDTH / originalSize.width
    setScaleFactor(scale)
    canvas.height = Math.round(originalSize.height * scale)
    setImageSize({ width: canvas.width, height: canvas.height })

    // Redraw everything
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      drawSelections(ctx)
    }
  }

  // Load image and set up canvas
  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      // Save original dimensions
      setOriginalSize({ width: img.width, height: img.height })

      if (imageRef.current) {
        imageRef.current.src = imageUrl
      }

      // Setup canvas once image is loaded
      setupCanvas()
    }
  }, [imageUrl])

  // Re-render canvas when selections change
  useEffect(() => {
    if (canvasRef.current && originalSize.width > 0) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        drawSelections(ctx)
      }
    }
  }, [selections, editingIndex])

  // Reset editingIndex if it's invalid after selections change
  useEffect(() => {
    if (editingIndex !== null && editingIndex >= selections.length) {
      setEditingIndex(null)
    }
  }, [selections, editingIndex])

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-setup canvas when tab becomes visible again
        setupCanvas()
      }
    }

    // Watch for resize events which might affect layout
    const handleResize = () => {
      setupCanvas()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('resize', handleResize)

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [originalSize])

  // Watch for any changes to container size
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      setupCanvas()
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [originalSize])

  // Draw all selections on canvas
  const drawSelections = (ctx: CanvasRenderingContext2D) => {
    if (!imageRef.current || !canvasRef.current) return

    // Clear canvas and redraw image
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    ctx.drawImage(imageRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

    // Draw all selections
    selections.forEach((selection, index) => {
      // Scale selection coordinates
      const scaledX = selection.x * scaleFactor
      const scaledY = selection.y * scaleFactor
      const scaledWidth = selection.width * scaleFactor
      const scaledHeight = selection.height * scaleFactor

      ctx.strokeStyle = index === editingIndex ? "#ff3e00" : "#0070f3"
      ctx.lineWidth = 2
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)

      // Draw label
      ctx.fillStyle = index === editingIndex ? "#ff3e00" : "#0070f3"
      ctx.fillRect(scaledX, scaledY - 20, selection.url ? 100 : 60, 20)
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px Arial"
      ctx.fillText(
        selection.url ? "Link Area #" + (index + 1) : "Area #" + (index + 1),
        scaledX + 5,
        scaledY - 5,
      )
    })

    // Draw current selection if in selecting mode
    if (isSelecting && currentSelection) {
      ctx.strokeStyle = "#ff3e00"
      ctx.lineWidth = 2
      ctx.strokeRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      )
    }
  }

  // Convert canvas coordinates to original image coordinates
  const canvasToOriginalCoords = (canvasX: number, canvasY: number) => {
    return {
      x: Math.round(canvasX / scaleFactor),
      y: Math.round(canvasY / scaleFactor)
    }
  }

  // Handle mouse events for selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Get coordinates relative to the canvas
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Account for any CSS scaling
    const cssScaleX = canvas.width / rect.width
    const cssScaleY = canvas.height / rect.height

    const adjustedX = x * cssScaleX
    const adjustedY = y * cssScaleY

    setCurrentSelection({
      x: adjustedX,
      y: adjustedY,
      width: 0,
      height: 0,
      url: "",
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !currentSelection || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()

    // Get coordinates and adjust for any CSS scaling
    const cssScaleX = canvas.width / rect.width
    const cssScaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * cssScaleX
    const y = (e.clientY - rect.top) * cssScaleY

    const newSelection = {
      ...currentSelection,
      width: x - currentSelection.x,
      height: y - currentSelection.y,
    }

    setCurrentSelection(newSelection)

    // Redraw canvas
    drawSelections(ctx)
  }

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection) return

    // Normalize negative width/height
    let { x, y, width, height } = currentSelection

    if (width < 0) {
      x += width
      width = Math.abs(width)
    }

    if (height < 0) {
      y += height
      height = Math.abs(height)
    }

    // Only add if selection has some size
    if (width > 5 && height > 5) {
      // Convert from canvas coordinates to original image coordinates
      const originalCoords = canvasToOriginalCoords(x, y)
      const originalWidth = Math.round(width / scaleFactor)
      const originalHeight = Math.round(height / scaleFactor)

      onAddSelection({
        x: originalCoords.x,
        y: originalCoords.y,
        width: originalWidth,
        height: originalHeight,
        url: ""
      })
    }

    setIsSelecting(false)
    setCurrentSelection(null)
  }

  const handleNewSelection = () => {
    setIsSelecting(true)
    setEditingIndex(null)
  }

  const handleEditSelection = (index: number) => {
    setEditingIndex(index)
    setIsSelecting(false)
  }

  const handleUpdateUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingIndex === null || editingIndex >= selections.length) return

    const updatedSelection = {
      ...selections[editingIndex],
      url: e.target.value,
    }

    onUpdateSelection(editingIndex, updatedSelection)
  }

  const handleUpdateCoordinates = (field: "x" | "y" | "width" | "height", value: string) => {
    if (editingIndex === null || editingIndex >= selections.length) return

    const numValue = Number.parseInt(value)
    if (isNaN(numValue)) return

    const updatedSelection = {
      ...selections[editingIndex],
      [field]: numValue,
    }

    onUpdateSelection(editingIndex, updatedSelection)
  }

  // Custom delete handler that also resets editingIndex if needed
  const handleDeleteSelection = (index: number) => {
    // If we're deleting the currently editing selection, reset the editing state
    if (editingIndex === index) {
      setEditingIndex(null)
    } else if (editingIndex !== null && index < editingIndex) {
      // If we're deleting an item before the currently editing one, adjust the index
      setEditingIndex(editingIndex - 1)
    }

    // Call the parent's delete handler
    onDeleteSelection(index)
  }

  const handleSliceImage = () => {
    if (!imageRef.current) return

    const img = imageRef.current
    const files: File[] = []
    let html = '<table cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">\n'

    // Create a temporary canvas for slicing
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return

    // Find all unique y-coordinates to determine horizontal slices
    const yCoordinates = new Set<number>()
    yCoordinates.add(0)
    yCoordinates.add(originalSize.height)

    selections.forEach((selection) => {
      yCoordinates.add(Math.max(0, Math.floor(selection.y)))
      yCoordinates.add(Math.min(originalSize.height, Math.ceil(selection.y + selection.height)))
    })

    // Sort y-coordinates
    const sortedYCoords = Array.from(yCoordinates).sort((a, b) => a - b)

    // Use a counter for naming slices
    let sliceCounter = 0

    // Process each horizontal slice
    for (let i = 0; i < sortedYCoords.length - 1; i++) {
      const rowStartY = sortedYCoords[i]
      const rowEndY = sortedYCoords[i + 1]
      const rowHeight = rowEndY - rowStartY

      if (rowHeight <= 0) continue

      html += "  <tr>\n"
      html += "    <td>\n"
      html += '      <table cellpadding="0" cellspacing="0" border="0">\n'
      html += "        <tr>\n"

      // Find all unique x-coordinates for this row
      const xCoordinates = new Set<number>()
      xCoordinates.add(0)
      xCoordinates.add(originalSize.width)

      selections.forEach((selection) => {
        // Only consider selections that intersect with this row
        if (selection.y + selection.height > rowStartY && selection.y < rowEndY) {
          xCoordinates.add(Math.max(0, Math.floor(selection.x)))
          xCoordinates.add(Math.min(originalSize.width, Math.ceil(selection.x + selection.width)))
        }
      })

      // Sort x-coordinates
      const sortedXCoords = Array.from(xCoordinates).sort((a, b) => a - b)

      // Group adjacent cells with the same link or both unselected
      let currentX = sortedXCoords[0]
      let currentUrl: string | null = null
      let currentWidth = 0

      for (let j = 0; j < sortedXCoords.length - 1; j++) {
        const cellStartX = sortedXCoords[j]
        const cellEndX = sortedXCoords[j + 1]
        const cellWidth = cellEndX - cellStartX

        if (cellWidth <= 0) continue

        // Find if this cell is part of a selection with a URL
        const cellCenterX = cellStartX + cellWidth / 2
        const cellCenterY = rowStartY + rowHeight / 2

        // Find the selection that contains this point
        const matchingSelection = selections.find(
          (s) =>
            cellCenterX >= s.x && cellCenterX < s.x + s.width && cellCenterY >= s.y && cellCenterY < s.y + s.height,
        )

        const cellUrl = matchingSelection?.url || null

        // Check if we should merge with the previous cell
        if (j > 0 && cellUrl === currentUrl) {
          // Merge with previous cell
          currentWidth += cellWidth
        } else {
          // Output the previous cell if it exists
          if (j > 0) {
            // Slice the image for the merged cell
            tempCanvas.width = currentWidth
            tempCanvas.height = rowHeight
            tempCtx.drawImage(img, currentX, rowStartY, currentWidth, rowHeight, 0, 0, currentWidth, rowHeight)

            // Convert to blob and create file
            sliceCounter++
            const fileName = `${originalFilename || "slice"}_${sliceCounter}.jpeg`

            tempCanvas.toBlob((blob) => {
              if (!blob) return
              const file = new File([blob], fileName, { type: "image/jpeg" })
              files.push(file)
            }, "image/jpeg")

            // Generate HTML
            if (currentUrl) {
              html += `          <td><a href="${currentUrl}" target="_blank"><img src="${fileName}" alt="${fileName}" style="display:block; border:0; width: 100%;" /></a></td>\n`
            } else {
              html += `          <td><img src="${fileName}" alt="${fileName}" style="display:block; border:0; width: 100%;" /></td>\n`
            }
          }

          // Start a new cell
          currentX = cellStartX
          currentUrl = cellUrl
          currentWidth = cellWidth
        }
      }

      // Output the last cell
      if (currentWidth > 0) {
        // Slice the image for the merged cell
        tempCanvas.width = currentWidth
        tempCanvas.height = rowHeight
        tempCtx.drawImage(img, currentX, rowStartY, currentWidth, rowHeight, 0, 0, currentWidth, rowHeight)

        // Convert to blob and create file
        sliceCounter++
        const fileName = `${originalFilename || "slice"}_${sliceCounter}.jpeg`

        tempCanvas.toBlob((blob) => {
          if (!blob) return
          const file = new File([blob], fileName, { type: "image/jpeg" })
          files.push(file)
        }, "image/jpeg")

        // Generate HTML
        if (currentUrl) {
          html += `          <td><a href="${currentUrl}" target="_blank"><img src="${fileName}" alt="${fileName}" style="display:block; border:0; width: 100%;" /></a></td>\n`
        } else {
          html += `          <td><img src="${fileName}" alt="${fileName}" style="display:block; border:0; width: 100%;" /></td>\n`
        }
      }

      html += "        </tr>\n"
      html += "      </table>\n"
      html += "    </td>\n"
      html += "  </tr>\n"
    }

    html += "</table>"

    // Wait for all blobs to be processed
    setTimeout(() => {
      onSliceImage({ html, files })
    }, 500)
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Image Editor</span>
                <div>
                <Button onClick={handleNewSelection} variant="outline" size="sm" className="mr-2">
                  <Plus className="mr-2 h-4 w-4" /> New Selection
                </Button>
                <Button onClick={handleSliceImage} disabled={selections.length === 0} size="sm">
                  <Scissors className="mr-2 h-4 w-4" /> Slice Image
                </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={containerRef} className="relative border rounded overflow-auto"
                style={{ maxHeight: "100vh" }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`cursor-${isSelecting ? "crosshair" : "default"} max-w-full`}
                  style={{ width: '100%', maxWidth: '640px', height: 'auto' }}
                />
                <img
                  ref={imageRef}
                  src={imageUrl || "/placeholder.svg"}
                  className="hidden"
                  alt="Original"
                  crossOrigin="anonymous"
                />
              </div>
              {isSelecting && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">Click and drag on the image to create a selection area.</p>
                </div>
              )}
              {originalFilename && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    Sliced images will be named:{" "}
                    <strong>
                      {originalFilename}_1.jpeg, {originalFilename}_2.jpeg, ...
                    </strong>
                  </p>
                </div>
              )}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm text-gray-800">
                  Display width: <strong>640px</strong> (original size: {originalSize.width}×{originalSize.height})
                </p>
              </div>
            </CardContent>
            <CardFooter>
            </CardFooter>
          </Card>
        </div>

        <div className="w-full md:w-96">
          <Card>
            <CardHeader>
              <CardTitle>Selections</CardTitle>
            </CardHeader>
            <CardContent>
              {selections.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No selections yet. Click "New Selection" to start.
                </p>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selections.map((selection, index) => (
                        <TableRow key={index}>
                          <TableCell>Area #{index + 1}</TableCell>
                          <TableCell className="truncate max-w-[100px]">{selection.url || "-"}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditSelection(index)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteSelection(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {editingIndex !== null && editingIndex < selections.length && (
                    <Card className="p-4 border-primary">
                      <h3 className="font-medium mb-3">Edit Area #{editingIndex + 1}</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="x">X Position</Label>
                            <Input
                              id="x"
                              type="number"
                              value={selections[editingIndex].x}
                              onChange={(e) => handleUpdateCoordinates("x", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="y">Y Position</Label>
                            <Input
                              id="y"
                              type="number"
                              value={selections[editingIndex].y}
                              onChange={(e) => handleUpdateCoordinates("y", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="width">Width</Label>
                            <Input
                              id="width"
                              type="number"
                              value={selections[editingIndex].width}
                              onChange={(e) => handleUpdateCoordinates("width", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="height">Height</Label>
                            <Input
                              id="height"
                              type="number"
                              value={selections[editingIndex].height}
                              onChange={(e) => handleUpdateCoordinates("height", e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="url">Link URL</Label>
                          <div className="flex">
                            <Input
                              id="url"
                              type="text"
                              value={selections[editingIndex].url}
                              onChange={handleUpdateUrl}
                              placeholder="https://example.com"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}