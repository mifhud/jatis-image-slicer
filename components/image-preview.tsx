"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CardHeader, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Code, Eye, Link, FileCheck, Copy, Check } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ImagePreviewProps {
  html: string
  files: File[]
  originalFilename: string
}

export default function ImagePreview({ html, files, originalFilename }: ImagePreviewProps) {
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState("preview")
  const [replacementUrls, setReplacementUrls] = useState("")
  const [updatedHtml, setUpdatedHtml] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const updatedIframeRef = useRef<HTMLIFrameElement>(null)

  // Create object URLs for all files
  useEffect(() => {
    const urls: Record<string, string> = {}

    files.forEach((file) => {
      urls[file.name] = URL.createObjectURL(file)
    })

    setFileUrls(urls)

    // Cleanup URLs on unmount
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  // Function to update iframe content
  const updateIframeContent = () => {
    if (iframeRef.current && Object.keys(fileUrls).length === files.length) {
      const doc = iframeRef.current.contentDocument
      if (!doc) return

      // Create HTML with replaced image sources
      let modifiedHtml = html

      Object.entries(fileUrls).forEach(([fileName, url]) => {
        modifiedHtml = modifiedHtml.replace(new RegExp(fileName, "g"), url)
      })

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Sliced Image Preview</title>
          <style>
            body { margin: 0; padding: 0; }
            table { border-collapse: collapse; }
          </style>
        </head>
        <body>
          ${modifiedHtml}
        </body>
        </html>
      `)
      doc.close()
    }
  }

  // Update the updated iframe content
  const updateUpdatedIframeContent = () => {
    if (updatedIframeRef.current && updatedHtml) {
      const doc = updatedIframeRef.current.contentDocument
      if (!doc) return

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Updated Image Preview</title>
          <style>
            body { margin: 0; padding: 0; }
            table { border-collapse: collapse; }
          </style>
        </head>
        <body>
          ${updatedHtml}
        </body>
        </html>
      `)
      doc.close()
    }
  }

  // Update iframe content when fileUrls change
  useEffect(() => {
    if (activeTab === "preview") {
      updateIframeContent()
    } else if (activeTab === "preview-updated" && updatedHtml) {
      updateUpdatedIframeContent()
    }
  }, [fileUrls, html, activeTab, updatedHtml])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // When switching to preview, update iframe content
    if (value === "preview") {
      // Small delay to ensure the iframe is ready
      setTimeout(updateIframeContent, 50)
    } else if (value === "preview-updated" && updatedHtml) {
      setTimeout(updateUpdatedIframeContent, 50)
    }
  }

  // Handle the Replace button click
  const handleReplace = () => {
    // Get the list of replacements
    const lines = replacementUrls.trim().split("\n");
    let newHtml = html;
    
    // Create a temporary DOM parser to manipulate HTML safely
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHtml, "text/html");
    
    // Replace each filename with the corresponding URL in src attributes only
    files.forEach((file, index) => {
      if (index < lines.length && lines[index].trim() !== "") {
        const newUrl = lines[index].trim();
        
        // Get all images with this source
        const images = doc.querySelectorAll(`img[src*="${file.name}"]`);
        images.forEach(img => {
          // Replace only the src attribute, preserving alt and other attributes
          img.setAttribute('src', img.getAttribute('src').replace(file.name, newUrl));
        });
      }
    });
    
    // Extract the updated HTML
    setUpdatedHtml(doc.body.innerHTML);
    setActiveTab("preview-updated");
  }

  const handleCopyCode = () => {
    if (!updatedHtml) return;
    
    navigator.clipboard.writeText(updatedHtml)
      .then(() => {
        setIsCopied(true);
        toast({
          title: "Code copied",
          description: "HTML code has been copied to clipboard",
          duration: 2000,
        });
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Copy failed",
          description: "Something went wrong when copying the code",
          variant: "destructive",
          duration: 2000,
        });
      });
  }

  const handleDownload = () => {
    // Create a zip file with JSZip
    import("jszip").then(({ default: JSZip }) => {
      const zip = new JSZip()

      // Add all image files
      files.forEach((file) => {
        zip.file(file.name, file)
      })

      // Add HTML file - use the updated HTML if available
      zip.file("sliced-image.html", updatedHtml || html)

      // Generate and download the zip
      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = URL.createObjectURL(content)
        const a = document.createElement("a")
        a.href = url
        a.download = `${originalFilename}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sliced Image Preview</h2>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Files
        </Button>
      </div>

      <Tabs defaultValue="preview" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </TabsTrigger>
          <TabsTrigger value="html">
            <Code className="mr-2 h-4 w-4" /> HTML
          </TabsTrigger>
          <TabsTrigger value="replace-url">
            <Link className="mr-2 h-4 w-4" /> Replace URL
          </TabsTrigger>
          <TabsTrigger value="preview-updated" disabled={!updatedHtml}>
            <FileCheck className="mr-2 h-4 w-4" /> Preview Updated
          </TabsTrigger>
          <TabsTrigger value="updated-html" disabled={!updatedHtml}>
            <Code className="mr-2 h-4 w-4" /> Updated HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="border rounded p-4">
          <div className="bg-gray-100 p-4 rounded">
            <iframe
              ref={iframeRef}
              className="w-full border-0 bg-white"
              style={{ minHeight: "100vh" }}
              title="Sliced Image Preview"
            />
          </div>
        </TabsContent>

        <TabsContent value="replace-url">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-semibold">Replace Image URLs</h3>
                <p className="text-sm text-gray-500">Enter new URLs for each image, one per line</p>
              </div>
              <Button onClick={handleReplace}>
                <Link className="mr-2 h-4 w-4" /> Replace
              </Button>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full p-4 border rounded-md font-mono text-sm"
                style={{ height: "100vh" }}
                value={replacementUrls}
                onChange={(e) => setReplacementUrls(e.target.value)}
                placeholder={files.map(file => file.name).join("\n")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview-updated" className="border rounded p-4">
          <div className="bg-gray-100 p-4 rounded">
            <iframe
              ref={updatedIframeRef}
              className="w-full border-0 bg-white"
              style={{ minHeight: "100vh" }}
              title="Updated Image Preview"
            />
          </div>
        </TabsContent>

        <TabsContent value="html">
          <Card className="p-4">
            <pre className="text-sm overflow-auto p-4 bg-gray-50 rounded">
              <code>{html}</code>
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="updated-html">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-lg font-semibold">Updated HTML Code</h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCopyCode}
                disabled={!updatedHtml}
              >
                {isCopied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {isCopied ? "Copied" : "Copy Code"}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-auto p-4 bg-gray-50 rounded">
                <code>{updatedHtml}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Files Ready for Download</h3>
        <p className="text-sm text-blue-700">
          {files.length} image slices and 1 HTML file will be included in the download.
          {updatedHtml && " Download will use the updated HTML with replaced URLs."}
        </p>
      </div>
    </div>
  )
}