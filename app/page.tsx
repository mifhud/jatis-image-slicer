"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import ImageUploader from "@/components/image-uploader"
import ImageEditor from "@/components/image-editor"
import ImagePreview from "@/components/image-preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Selection } from "@/types/selection"

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload")
  const [image, setImage] = useState<string | null>(null)
  const [originalFilename, setOriginalFilename] = useState<string>("")
  const [selections, setSelections] = useState<Selection[]>([])
  const [slicedImage, setSlicedImage] = useState<{ html: string; files: File[] } | null>(null)

  const handleImageUpload = (imageDataUrl: string, filename: string) => {
    setImage(imageDataUrl)
    setOriginalFilename(filename)
    setSelections([])
    setSlicedImage(null)
  }

  const handleAddSelection = (selection: Selection) => {
    setSelections([...selections, selection])
  }

  const handleUpdateSelection = (index: number, selection: Selection) => {
    const updatedSelections = [...selections]
    updatedSelections[index] = selection
    setSelections(updatedSelections)
  }

  const handleDeleteSelection = (index: number) => {
    const updatedSelections = [...selections]
    updatedSelections.splice(index, 1)
    setSelections(updatedSelections)
  }

  const handleSliceImage = (result: { html: string; files: File[] }) => {
    setSlicedImage(result)
    setActiveTab('preview')
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Image Slicer</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="upload">Upload Image</TabsTrigger>
          <TabsTrigger value="edit" disabled={!image}>
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!slicedImage}>
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card className="p-6">
            <ImageUploader
              onImageUpload={handleImageUpload}
              onUploadComplete={() => setActiveTab("edit")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          {image && (
            <Card className="p-6">
              <ImageEditor
                imageUrl={image}
                originalFilename={originalFilename.replace(/[^a-zA-Z0-9]/g, '')}
                selections={selections}
                onAddSelection={handleAddSelection}
                onUpdateSelection={handleUpdateSelection}
                onDeleteSelection={handleDeleteSelection}
                onSliceImage={handleSliceImage}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview">
          {slicedImage && (
            <Card className="p-6">
              <ImagePreview html={slicedImage.html} files={slicedImage.files} originalFilename={originalFilename.replace(/[^a-zA-Z0-9]/g, '')} />
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
