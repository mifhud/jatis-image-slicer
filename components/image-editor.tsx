"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Scissors, Plus, Edit, Replace } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImageEditor({
  imageUrl,
  originalFilename,
  selections,
  onAddSelection,
  onUpdateSelection,
  onDeleteSelection,
  onSliceImage
}) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionType, setSelectionType] = useState("link"); // "link" or "replace"
  const [currentSelection, setCurrentSelection] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  const CANVAS_WIDTH = 640;
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const setupCanvas = () => {
    if (!imageRef.current || !canvasRef.current) return;

    const e = imageRef.current;
    const t = canvasRef.current;

    t.width = CANVAS_WIDTH;
    const n = CANVAS_WIDTH / originalSize.width;
    setScaleFactor(n);
    t.height = Math.round(originalSize.height * n);
    setImageSize({ width: t.width, height: t.height });

    const i = t.getContext("2d");
    i && (i.drawImage(e, 0, 0, t.width, t.height), drawSelections(i));
  };

  const drawSelections = (e) => {
    if (!imageRef.current || !canvasRef.current) return;

    e.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    e.drawImage(imageRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    selections.forEach((t, n) => {
      const i = t.x * scaleFactor;
      const r = t.y * scaleFactor;
      const o = t.width * scaleFactor;
      const s = t.height * scaleFactor;

      // Different colors for different types of selections
      const selectionColor = n === editingIndex ? "#ff3e00" : (t.type === "replace" ? "#00c853" : "#0070f3");

      e.strokeStyle = selectionColor;
      e.lineWidth = 2;
      e.strokeRect(i, r, o, s);

      e.fillStyle = selectionColor;
      e.fillRect(i, r - 20, t.type === "replace" ? 120 : (t.url ? 100 : 60), 20);

      e.fillStyle = "#ffffff";
      e.font = "12px Arial";

      if (t.type === "replace") {
        e.fillText("Replace #" + (n + 1), i + 5, r - 5);
      } else {
        e.fillText(t.url ? "Link Area #" + (n + 1) : "Area #" + (n + 1), i + 5, r - 5);
      }
    });

    if (isSelecting && currentSelection) {
      e.strokeStyle = "#ff3e00";
      e.lineWidth = 2;
      e.strokeRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      );
    }
  };

  const canvasToOriginalCoords = (e, t) => ({
    x: Math.round(e / scaleFactor),
    y: Math.round(t / scaleFactor)
  });

  const handleMouseDown = (e) => {
    if (!isSelecting || !canvasRef.current) return;

    const t = canvasRef.current;
    const n = t.getBoundingClientRect();
    const i = e.clientX - n.left;
    const r = e.clientY - n.top;
    const o = t.width / n.width;
    const s = t.height / n.height;
    const a = i * o;
    const c = r * s;

    setCurrentSelection({
      x: a,
      y: c,
      width: 0,
      height: 0,
      type: selectionType,
      url: "",
      replaceValue: "",
      textAlign: "center",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      color: "#000000"
    });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !currentSelection || !canvasRef.current) return;

    const t = canvasRef.current;
    const n = t.getContext("2d");

    if (!n) return;

    const i = t.getBoundingClientRect();
    const r = t.width / i.width;
    const o = t.height / i.height;
    const s = (e.clientX - i.left) * r;
    const a = (e.clientY - i.top) * o;

    const c = {
      ...currentSelection,
      width: s - currentSelection.x,
      height: a - currentSelection.y
    };

    setCurrentSelection(c);
    drawSelections(n);
  };

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection) return;

    let { x: e, y: t, width: n, height: i, type } = currentSelection;

    n < 0 && ((e += n), (n = Math.abs(n)));
    i < 0 && ((t += i), (i = Math.abs(i)));

    if (n > 5 && i > 5) {
      onAddSelection({
        ...canvasToOriginalCoords(e, t),
        width: Math.round(n / scaleFactor),
        height: Math.round(i / scaleFactor),
        type,
        url: "",
        replaceValue: "",
        textAlign: "center",
        fontSize: "14px",
        backgroundColor: "#ffffff",
        color: "#000000"
      });
    }

    setIsSelecting(false);
    setCurrentSelection(null);
  };

  const handleNewSelection = (type) => {
    setSelectionType(type);
    setIsSelecting(true);
    setEditingIndex(null);
  };

  const handleEditSelection = (e) => {
    setEditingIndex(e);
    setIsSelecting(false);
  };

  const handleUpdateUrl = (e) => {
    if (editingIndex === null || editingIndex >= selections.length) return;

    onUpdateSelection(editingIndex, {
      ...selections[editingIndex],
      url: e.target.value
    });
  };

  const handleUpdateReplaceValue = (e) => {
    if (editingIndex === null || editingIndex >= selections.length) return;

    onUpdateSelection(editingIndex, {
      ...selections[editingIndex],
      replaceValue: e.target.value
    });
  };

  const handleUpdateStyle = (property, value) => {
    if (editingIndex === null || editingIndex >= selections.length) return;

    onUpdateSelection(editingIndex, {
      ...selections[editingIndex],
      [property]: value
    });
  };

  const handleUpdateCoordinates = (e, t) => {
    if (editingIndex === null || editingIndex >= selections.length) return;

    const n = Number.parseInt(t);
    isNaN(n) ||
      onUpdateSelection(editingIndex, {
        ...selections[editingIndex],
        [e]: n
      });
  };

  const handleDeleteSelection = (e) => {
    editingIndex === e
      ? setEditingIndex(null)
      : editingIndex !== null && e < editingIndex && setEditingIndex(editingIndex - 1);

    onDeleteSelection(e);
  };

  const handleSliceImage = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const files = [];
    let html = '<table cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">\n';

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Find all unique row positions
    const rowPositions = new Set();
    rowPositions.add(0);
    rowPositions.add(originalSize.height);
    selections.forEach(sel => {
      rowPositions.add(Math.max(0, Math.floor(sel.y)));
      rowPositions.add(Math.min(originalSize.height, Math.ceil(sel.y + sel.height)));
    });

    const rows = Array.from(rowPositions).sort((a, b) => a - b);
    let fileCounter = 0;

    for (let i = 0; i < rows.length - 1; i++) {
      const rowStart = rows[i];
      const rowEnd = rows[i + 1];
      const rowHeight = rowEnd - rowStart;

      if (rowHeight <= 0) continue;

      html += "  <tr>\n";
      html += "    <td>\n";
      html += "      <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n";
      html += "        <tr>\n";

      // Find all unique column positions
      const colPositions = new Set();
      colPositions.add(0);
      colPositions.add(originalSize.width);
      selections.forEach(sel => {
        if (sel.y + sel.height > rowStart && sel.y < rowEnd) {
          colPositions.add(Math.max(0, Math.floor(sel.x)));
          colPositions.add(Math.min(originalSize.width, Math.ceil(sel.x + sel.width)));
        }
      });

      const cols = Array.from(colPositions).sort((a, b) => a - b);

      // Calculate slices
      let slices = [];
      for (let j = 0; j < cols.length - 1; j++) {
        const colStart = cols[j];
        const colEnd = cols[j + 1];
        const colWidth = colEnd - colStart;

        if (colWidth <= 0) continue;

        // Find center point of this cell to check for selections
        const centerX = colStart + colWidth / 2;
        const centerY = rowStart + rowHeight / 2;

        // Find if there's a selection covering this cell
        const selection = selections.find(sel =>
          centerX >= sel.x && centerX < sel.x + sel.width &&
          centerY >= sel.y && centerY < sel.y + sel.height
        );

        slices.push({
          start: colStart,
          width: colWidth,
          selection: selection
        });
      }

      // Calculate total width for percentage calculations
      const totalWidth = slices.reduce((sum, slice) => sum + slice.width, 0);

      // Process each column slice
      for (let j = 0; j < slices.length; j++) {
        const slice = slices[j];
        const colStart = slice.start;
        const colWidth = slice.width;
        const selection = slice.selection;

        // Extract image slice
        tempCanvas.width = colWidth;
        tempCanvas.height = rowHeight;
        tempCtx.drawImage(img, colStart, rowStart, colWidth, rowHeight, 0, 0, colWidth, rowHeight);

        fileCounter++;
        const fileName = `${originalFilename || "slice"}_${fileCounter}.jpeg`;

        // Create blob and add to files array
        tempCanvas.toBlob((blob) => {
          if (blob) {
            files.push(new File([blob], fileName, { type: "image/jpeg" }));
          }
        }, "image/jpeg");

        // Calculate percentage width
        const widthPercent = (colWidth / totalWidth * 100).toFixed(2) + "%";

        // Check if this is a replacement cell
        if (selection && selection.type === "replace") {
          const matchFont = selection.fontSize.match(/^(-?\d*\.?\d+)(px|em|rem)$/)
          const fontSize = matchFont[1];
          const unit = matchFont[2];
          
          // Add replacement cell
          const textStyles = `padding: 0; margin: 0; text-align: ${selection.textAlign}; font-size: ${selection.fontSize}; background-color: ${selection.backgroundColor}; color: ${selection.color};`;
          html += `          <td width="${widthPercent}" height="${fontSize * 1.2}${unit}"><div style="${textStyles}">${selection.replaceValue}</div></td>\n`;
        } else {
          // Add image cell, possibly with link
          if (selection && selection.type === "link" && selection.url) {
            html += `          <td width="${widthPercent}"><a href="${selection.url}" target="_blank"><img src="${fileName}" alt="${fileName}" style="display:block; border:0; width: 100%;" /></a></td>\n`;
          } else {
            html += `          <td width="${widthPercent}"><img src="${fileName}" alt="${fileName}" style="display:block; border:0; width: 100%;" /></td>\n`;
          }
        }
      }

      html += "        </tr>\n";
      html += "      </table>\n";
      html += "    </td>\n";
      html += "  </tr>\n";
    }

    html += "</table>";

    // Allow time for all blobs to be created
    setTimeout(() => {
      onSliceImage({ html, files });
    }, 500);
  };

  useEffect(() => {
    const e = new Image();
    e.src = imageUrl;
    e.onload = () => {
      setOriginalSize({ width: e.width, height: e.height });
      imageRef.current && (imageRef.current.src = imageUrl);
      setupCanvas();
    };
  }, [imageUrl]);

  useEffect(() => {
    canvasRef.current &&
      originalSize.width > 0 &&
      drawSelections(canvasRef.current.getContext("2d"));
  }, [selections, editingIndex]);

  useEffect(() => {
    editingIndex !== null &&
      editingIndex >= selections.length &&
      setEditingIndex(null);
  }, [selections, editingIndex]);

  useEffect(() => {
    const e = () => {
      document.visibilityState === "visible" && setupCanvas();
    };
    const t = () => {
      setupCanvas();
    };

    document.addEventListener("visibilitychange", e);
    window.addEventListener("resize", t);

    return () => {
      document.removeEventListener("visibilitychange", e);
      window.removeEventListener("resize", t);
    };
  }, [originalSize]);

  useEffect(() => {
    if (!containerRef.current) return;

    const e = new ResizeObserver(() => {
      setupCanvas();
    });

    e.observe(containerRef.current);

    return () => {
      e.disconnect();
    };
  }, [originalSize]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Image Editor</span>
                <div>
                  <Button
                    onClick={() => handleNewSelection("link")}
                    variant="outline"
                    size="sm"
                    className="mr-2"
                  >
                    <Plus className="mr-2 h-4 w-4" /> New Selection
                  </Button>
                  <Button
                    onClick={() => handleNewSelection("replace")}
                    variant="outline"
                    size="sm"
                    className="mr-2 bg-green-50"
                  >
                    <Plus className="mr-2 h-4 w-4" /> New Replace Selection
                  </Button>
                  <Button
                    onClick={handleSliceImage}
                    disabled={selections.length === 0}
                    size="sm"
                  >
                    <Scissors className="mr-2 h-4 w-4" /> Slice Image
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={containerRef}
                className="relative border rounded overflow-auto"
                style={{ maxHeight: "100vh" }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`cursor-${isSelecting ? "crosshair" : "default"} max-w-full`}
                  style={{ width: "100%", maxWidth: "640px", height: "auto" }}
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
                  <p className="text-sm text-yellow-800">
                    Click and drag on the image to create a {selectionType === "replace" ? "replacement" : "selection"} area.
                  </p>
                </div>
              )}
              {originalFilename && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    Sliced images will be named: <strong>{originalFilename}_1.jpeg, {originalFilename}_2.jpeg, ...</strong>
                  </p>
                </div>
              )}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm text-gray-800">
                  Display width: <strong>640px</strong> (original size: {originalSize.width}×{originalSize.height})
                </p>
              </div>
            </CardContent>
            <CardFooter></CardFooter>
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
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selections.map((e, t) => (
                        <TableRow key={t}>
                          <TableCell>Area #{t + 1}</TableCell>
                          <TableCell>
                            {e.type === "replace" ? "Replace" : (e.url ? "Link" : "No Link")}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSelection(t)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSelection(t)}
                              >
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
                      <h3 className="font-medium mb-3">
                        Edit {selections[editingIndex].type === "replace" ? "Replace" : "Area"} #{editingIndex + 1}
                      </h3>
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

                        {selections[editingIndex].type === "replace" ? (
                          <>
                            <div>
                              <Label htmlFor="replaceValue">Replace Value</Label>
                              <div className="flex">
                                <Input
                                  id="replaceValue"
                                  type="text"
                                  value={selections[editingIndex].replaceValue}
                                  onChange={handleUpdateReplaceValue}
                                  placeholder="Text content to display"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="textAlign">Text Align</Label>
                              <Select
                                value={selections[editingIndex].textAlign}
                                onValueChange={(value) => handleUpdateStyle("textAlign", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select text alignment" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="right">Right</SelectItem>
                                  <SelectItem value="justify">Justify</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="fontSize">Font Size</Label>
                              <Input
                                id="fontSize"
                                type="text"
                                value={selections[editingIndex].fontSize}
                                onChange={(e) => handleUpdateStyle("fontSize", e.target.value)}
                                placeholder="14px"
                              />
                            </div>
                            <div>
                              <Label htmlFor="backgroundColor">Background Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="backgroundColor"
                                  type="text"
                                  value={selections[editingIndex].backgroundColor}
                                  onChange={(e) => handleUpdateStyle("backgroundColor", e.target.value)}
                                  placeholder="#ffffff"
                                />
                                <Input
                                  type="color"
                                  value={selections[editingIndex].backgroundColor}
                                  onChange={(e) => handleUpdateStyle("backgroundColor", e.target.value)}
                                  className="w-12 p-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="color">Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="color"
                                  type="text"
                                  value={selections[editingIndex].color}
                                  onChange={(e) => handleUpdateStyle("color", e.target.value)}
                                  placeholder="#000000"
                                />
                                <Input
                                  type="color"
                                  value={selections[editingIndex].color}
                                  onChange={(e) => handleUpdateStyle("color", e.target.value)}
                                  className="w-12 p-1"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
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
                        )}
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
  );
}