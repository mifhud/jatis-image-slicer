"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CardHeader, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Code, Eye, Link, FileCheck, Copy, Check, Monitor, Smartphone, Edit, Save, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input" // Added Input import
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
  const [editableHtml, setEditableHtml] = useState(html)
  const [updatedHtml, setUpdatedHtml] = useState("")
  const [editableUpdatedHtml, setEditableUpdatedHtml] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")
  const [adjustmentFactor, setAdjustmentFactor] = useState("1.0") // New state for adjustment factor
  const [tableWithDivExistsInHtml, setTableWithDivExistsInHtml] = useState(false) // State to track if table with div exists
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

  // Initialize the editable HTML when html prop changes
  useEffect(() => {
    setEditableHtml(html)
    
    // Check if HTML contains a div within a table
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const tablesWithDivs = doc.querySelectorAll("table div")
    setTableWithDivExistsInHtml(tablesWithDivs.length > 0)
  }, [html])

  // Initialize the editable updated HTML when updatedHtml changes
  useEffect(() => {
    if (updatedHtml) {
      setEditableUpdatedHtml(updatedHtml)
    }
  }, [updatedHtml])

  // Function to update iframe content
  const updateIframeContent = () => {
    if (iframeRef.current && Object.keys(fileUrls).length === files.length) {
      const doc = iframeRef.current.contentDocument
      if (!doc) return

      // Create HTML with replaced image sources
      let modifiedHtml = editableHtml // Using editableHtml instead of html

      Object.entries(fileUrls).forEach(([fileName, url]) => {
        modifiedHtml = modifiedHtml.replace(new RegExp(fileName, "g"), url)
      })

      doc.open()
      doc.write(modifiedHtml)
      doc.close()
    }
  }

  // Update the updated iframe content
  const updateUpdatedIframeContent = () => {
    if (updatedIframeRef.current && editableUpdatedHtml) {
      const doc = updatedIframeRef.current.contentDocument
      if (!doc) return

      doc.open()
      doc.write(editableUpdatedHtml)
      doc.close()
    }
  }

  // Update iframe content when relevant state changes
  useEffect(() => {
    if (activeTab === "preview") {
      updateIframeContent()
    } else if (activeTab === "preview-updated" && editableUpdatedHtml) {
      updateUpdatedIframeContent()
    }
  }, [fileUrls, editableHtml, activeTab, editableUpdatedHtml, viewMode])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // When switching to preview, update iframe content
    if (value === "preview") {
      // Small delay to ensure the iframe is ready
      setTimeout(updateIframeContent, 50)
    } else if (value === "preview-updated" && editableUpdatedHtml) {
      setTimeout(updateUpdatedIframeContent, 50)
    }
  }

  // Handle view mode change
  const handleViewModeChange = (mode: "desktop" | "mobile") => {
    setViewMode(mode)
  }

  // Handle the Replace button click
  const handleReplace = () => {
    // Get the list of replacements
    const lines = replacementUrls.trim().split("\n");
    let newHtml = editableHtml; // Using editableHtml instead of html
    
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
    const updatedContent = doc.body.innerHTML;
    setUpdatedHtml(updatedContent);
    setEditableUpdatedHtml(updatedContent);
    setActiveTab("preview-updated");
    
    toast({
      title: "URLs replaced",
      description: "Image URLs have been successfully replaced",
      duration: 2000,
    });
  }

  // Handle adjusting sibling images based on div font size - NEW FUNCTION
  const handleAdjustSiblingImages = () => {
    // Parse the HTML to manipulate it
    const parser = new DOMParser();
    const doc = parser.parseFromString(editableHtml, "text/html");
    
    // Find all divs within tables
    const tablesWithDivs = doc.querySelectorAll("table div");
    
    if (tablesWithDivs.length === 0) {
      toast({
        title: "No adjustable images found",
        description: "Could not find any div elements within tables",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    let adjustmentsCount = 0;
    
    // Process each div within a table
    tablesWithDivs.forEach(div => {
      // Check if the div has a font-size style
      const style = div.getAttribute("style");
      if (!style || !style.includes("font-size")) return;
      
      // Extract the font size value (assuming it's in decimal format)
      const fontSizeMatch = style.match(/font-size:\s*([\d.]+)(?:px|em|rem|pt)?/);
      if (!fontSizeMatch) return;
      
      const fontSize = parseFloat(fontSizeMatch[1]);
      if (isNaN(fontSize)) return;
      
      // Find the parent table
      const parentTable = div.closest("table");
      if (!parentTable) return;
      
      // Find images within the same parent table
      const siblingImages = parentTable.querySelectorAll("img");
      if (siblingImages.length === 0) return;
      
      // Apply the calculation to the image height
      const factor = parseFloat(adjustmentFactor);
      if (isNaN(factor)) return;
      
      const newHeight = fontSize * factor;
      
      siblingImages.forEach(img => {
        // Get current style
        let imgStyle = img.getAttribute("style") || "";
        
        // Remove existing height if present
        imgStyle = imgStyle.replace(/height\s*:\s*[^;]+;?/, "").trim();

        // Add new height
        imgStyle += ` height: ${newHeight}px;`.replace(/;\s*;/, ";");
        
        // Set the updated style
        img.setAttribute("style", imgStyle.trim());
        adjustmentsCount++;
      });
    });
    
    // Update the HTML with our changes
    const updatedContent = doc.body.innerHTML;
    setEditableHtml(updatedContent);
    
    // Update the preview if active
    if (activeTab === "preview") {
      setTimeout(updateIframeContent, 50);
    }
    
    toast({
      title: "Images adjusted",
      description: `Adjusted height for ${adjustmentsCount} image(s) based on div font size × ${adjustmentFactor}`,
      duration: 2000,
    });
  }

  const handleCopyCode = (content: string) => {
    if (!content) return;
    
    navigator.clipboard.writeText(content)
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
      zip.file("sliced-image.html", editableUpdatedHtml || editableHtml)

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

  // Handle HTML editing
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableHtml(e.target.value);
    // We can immediately update the preview if it's active
    if (activeTab === "preview") {
      setTimeout(updateIframeContent, 50);
    }
    
    // Check if HTML contains a div within a table after edit
    const parser = new DOMParser();
    const doc = parser.parseFromString(e.target.value, "text/html");
    const tablesWithDivs = doc.querySelectorAll("table div");
    setTableWithDivExistsInHtml(tablesWithDivs.length > 0);
  }

  // Handle updated HTML editing
  const handleUpdatedHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableUpdatedHtml(e.target.value);
    // We can immediately update the preview if it's active
    if (activeTab === "preview-updated") {
      setTimeout(updateUpdatedIframeContent, 50);
    }
  }

  // Get iframe styles based on view mode
  const getIframeStyles = () => {
    if (viewMode === "mobile") {
      return {
        width: "360px",
        height: "640px",
        border: "0",
        backgroundColor: "white",
        margin: "0 auto",
        display: "block",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
      }
    }
    return {
      width: "100%",
      minHeight: "100vh",
      border: "0",
      backgroundColor: "white"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sliced Image Preview</h2>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Files
        </Button>
      </div>

      {/* New image adjustment UI */}
      {tableWithDivExistsInHtml && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 flex items-center space-x-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">Adjust Sibling Images</h3>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                step="0.1"
                value={adjustmentFactor}
                onChange={(e) => setAdjustmentFactor(e.target.value)}
                className="max-w-xs"
                placeholder="Adjustment Factor"
              />
              <Button onClick={handleAdjustSiblingImages}>
                <Pencil className="mr-2 h-4 w-4" /> Adjust Sibling Images
              </Button>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Multiplies div font-size with factor to set image height
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </TabsTrigger>
          <TabsTrigger value="html">
            <Edit className="mr-2 h-4 w-4" /> Edit HTML
          </TabsTrigger>
          <TabsTrigger value="replace-url">
            <Link className="mr-2 h-4 w-4" /> Replace URL
          </TabsTrigger>
          <TabsTrigger value="preview-updated" disabled={!editableUpdatedHtml}>
            <FileCheck className="mr-2 h-4 w-4" /> Preview Updated
          </TabsTrigger>
          <TabsTrigger value="updated-html" disabled={!editableUpdatedHtml}>
            <Edit className="mr-2 h-4 w-4" /> Edit Updated HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="border rounded p-4">
          <div className="flex justify-end space-x-2 mb-4">
            <Button 
              size="sm" 
              variant={viewMode === "desktop" ? "default" : "outline"} 
              onClick={() => handleViewModeChange("desktop")}
            >
              <Monitor className="mr-2 h-4 w-4" /> Desktop
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === "mobile" ? "default" : "outline"} 
              onClick={() => handleViewModeChange("mobile")}
            >
              <Smartphone className="mr-2 h-4 w-4" /> Mobile
            </Button>
          </div>
          <div className={`bg-gray-100 p-4 rounded ${viewMode === "mobile" ? "flex justify-center" : ""}`}>
            <iframe
              ref={iframeRef}
              style={getIframeStyles()}
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
          <div className="flex justify-end space-x-2 mb-4">
            <Button 
              size="sm" 
              variant={viewMode === "desktop" ? "default" : "outline"} 
              onClick={() => handleViewModeChange("desktop")}
            >
              <Monitor className="mr-2 h-4 w-4" /> Desktop
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === "mobile" ? "default" : "outline"} 
              onClick={() => handleViewModeChange("mobile")}
            >
              <Smartphone className="mr-2 h-4 w-4" /> Mobile
            </Button>
          </div>
          <div className={`bg-gray-100 p-4 rounded ${viewMode === "mobile" ? "flex justify-center" : ""}`}>
            <iframe
              ref={updatedIframeRef}
              style={getIframeStyles()}
              title="Updated Image Preview"
            />
          </div>
        </TabsContent>

        <TabsContent value="html">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-semibold">Edit HTML Code</h3>
                <p className="text-sm text-gray-500">Changes will update the preview in real-time</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCopyCode(editableHtml)}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-[70vh] p-4 border rounded-md font-mono text-sm"
                value={editableHtml}
                onChange={handleHtmlChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updated-html">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-semibold">Edit Updated HTML Code</h3>
                <p className="text-sm text-gray-500">Changes will update the preview in real-time</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCopyCode(editableUpdatedHtml)}
                  disabled={!editableUpdatedHtml}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-[70vh] p-4 border rounded-md font-mono text-sm"
                value={editableUpdatedHtml}
                onChange={handleUpdatedHtmlChange}
                disabled={!editableUpdatedHtml}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Files Ready for Download</h3>
        <p className="text-sm text-blue-700">
          {files.length} image slices and 1 HTML file will be included in the download.
          {editableUpdatedHtml && " Download will use the updated HTML with replaced URLs."}
        </p>
      </div>
    </div>
  )
}