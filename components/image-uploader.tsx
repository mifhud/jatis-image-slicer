"use client"
import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon } from "lucide-react"

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string, filename: string) => void
  onUploadComplete?: () => void
}

export default function ImageUploader({ onImageUpload, onUploadComplete }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      processFile(file)
    }
  }

  const convertToJpg = (imageDataUrl: string, filename: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Create canvas to convert the image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Fill with white background (for transparent PNGs)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the image
          ctx.drawImage(img, 0, 0)
          
          // Convert to JPG
          const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.9)
          resolve(jpgDataUrl)
        } else {
          // Fallback if context isn't available
          resolve(imageDataUrl)
        }
      }
      img.src = imageDataUrl
    })
  }

  const processFile = (file: File) => {
    setIsConverting(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      if (e.target?.result) {
        // Extract filename without extension
        const filename = file.name.replace(/\.[^/.]+$/, "")
        
        try {
          // Convert to JPG regardless of input format
          const jpgDataUrl = await convertToJpg(e.target.result as string, filename)
          onImageUpload(jpgDataUrl, filename)
          onUploadComplete?.()
        } catch (error) {
          console.error("Error converting image to JPG:", error)
          // Fallback to original format if conversion fails
          onImageUpload(e.target.result as string, filename)
          onUploadComplete?.()
        } finally {
          setIsConverting(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-lg mb-4 text-center">
          {isConverting 
            ? "Converting image to JPG..." 
            : "Drag and drop an image here, or click to select"}
        </p>
        <Button onClick={handleButtonClick} disabled={isConverting}>
          <Upload className="mr-2 h-4 w-4" /> Select Image
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden"
          disabled={isConverting} 
        />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Supported formats: JPG, PNG, GIF, WebP (will be converted to JPG)
      </p>
    </div>
  )
}