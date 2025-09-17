"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, FileText, ArrowLeft, Loader2, Download, History, ImageIcon } from "lucide-react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { RouteGuard } from "@/components/route-guard"

interface PDFGeneration {
  id?: string
  topic: string
  content: string
  status: string
  pdf_url?: string
  created_at?: string
}

interface GeneratedContent {
  title: string
  sections: {
    heading: string
    content: string
    imagePrompt?: string
  }[]
  conclusion: string
}

export default function PDFGeneratorPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [previousPDFs, setPreviousPDFs] = useState<PDFGeneration[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchPreviousPDFs()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    setUser(user)
    setLoading(false)
  }

  const fetchPreviousPDFs = async () => {
    const { data, error } = await supabase
      .from("pdf_generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setPreviousPDFs(data)
    }
  }

  const generatePDF = async () => {
    if (!topic.trim()) return

    setGenerating(true)
    setGenerationProgress(0)
    setCurrentStep("Generating content...")

    try {
      // Step 1: Generate content
      setGenerationProgress(20)
      const contentResponse = await fetch("/api/generate-pdf-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      })

      if (!contentResponse.ok) {
        throw new Error("Failed to generate content")
      }

      const contentData = await contentResponse.json()
      setGeneratedContent(contentData.content)
      setGenerationProgress(60)
      setCurrentStep("Creating PDF document...")

      // Step 2: Generate PDF
      const pdfResponse = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          content: contentData.content,
        }),
      })

      if (!pdfResponse.ok) {
        throw new Error("Failed to generate PDF")
      }

      const pdfData = await pdfResponse.json()
      setGenerationProgress(100)
      setCurrentStep("PDF generated successfully!")

      // Refresh the previous PDFs list
      await fetchPreviousPDFs()

      // Auto-download the PDF
      if (pdfData.downloadUrl) {
        const link = document.createElement("a")
        link.href = pdfData.downloadUrl
        link.download = `${topic.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      setCurrentStep("Error generating PDF. Please try again.")
    } finally {
      setGenerating(false)
      setTimeout(() => {
        setGenerationProgress(0)
        setCurrentStep("")
      }, 3000)
    }
  }

  const downloadPDF = async (pdfId: string, topic: string) => {
    try {
      const response = await fetch(`/api/download-pdf/${pdfId}`)
      if (!response.ok) throw new Error("Failed to download PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${topic.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading PDF:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requiredRoles={["user", "teacher", "admin"]}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">PDF Generator</h1>
                  <p className="text-sm text-muted-foreground">Create comprehensive educational materials</p>
                </div>
              </div>
              <Button onClick={() => setShowHistory(!showHistory)} variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                {showHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Generator Form */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generate PDF
                  </CardTitle>
                  <CardDescription>
                    Enter a topic and AI will create a comprehensive educational document with detailed content and
                    images
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Textarea
                      id="topic"
                      placeholder="e.g., The Solar System, Machine Learning Basics, Ancient Egyptian Civilization..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button onClick={generatePDF} disabled={!topic.trim() || generating} className="w-full">
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate PDF
                      </>
                    )}
                  </Button>

                  {generating && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{generationProgress}%</span>
                      </div>
                      <Progress value={generationProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground">{currentStep}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* History Panel */}
              {showHistory && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Previous PDFs</CardTitle>
                    <CardDescription>Your recently generated documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {previousPDFs.map((pdf) => (
                        <div key={pdf.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={pdf.status === "completed" ? "default" : "secondary"}>{pdf.status}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(pdf.created_at!).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{pdf.topic}</p>
                          {pdf.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 w-full bg-transparent"
                              onClick={() => downloadPDF(pdf.id!, pdf.topic)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Generated Content Preview */}
            <div className="lg:col-span-2">
              {generatedContent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Content Preview</CardTitle>
                    <CardDescription>Preview of your educational document</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold text-primary mb-4">{generatedContent.title}</h1>
                    </div>

                    {generatedContent.sections.map((section, index) => (
                      <div key={index} className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
                        <div className="prose prose-sm max-w-none">
                          {section.content.split("\n").map((paragraph, pIndex) => (
                            <p key={pIndex} className="mb-3 text-muted-foreground leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                        {section.imagePrompt && (
                          <div className="bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              <strong>Image:</strong> {section.imagePrompt}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="pt-4 border-t">
                      <h2 className="text-xl font-semibold text-foreground mb-3">Conclusion</h2>
                      <div className="prose prose-sm max-w-none">
                        {generatedContent.conclusion.split("\n").map((paragraph, pIndex) => (
                          <p key={pIndex} className="mb-3 text-muted-foreground leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!generatedContent && !generating && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Content Generated Yet</h3>
                    <p className="text-muted-foreground">
                      Enter a topic and click "Generate PDF" to create a comprehensive educational document with
                      detailed content and images.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
