import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import jsPDF from "jspdf"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { topic, content } = await request.json()

    if (!topic || !content) {
      return NextResponse.json({ error: "Topic and content are required" }, { status: 400 })
    }

    // Create PDF using jsPDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number, isBold = false) => {
      doc.setFontSize(fontSize)
      if (isBold) {
        doc.setFont("helvetica", "bold")
      } else {
        doc.setFont("helvetica", "normal")
      }

      const lines = doc.splitTextToSize(text, maxWidth)

      // Check if we need a new page
      if (yPosition + lines.length * (fontSize * 0.4) > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }

      doc.text(lines, margin, yPosition)
      yPosition += lines.length * (fontSize * 0.4) + 5
    }

    // Add title
    addText(content.title, 20, true)
    yPosition += 10

    // Add sections
    content.sections.forEach((section: any) => {
      // Add section heading
      addText(section.heading, 16, true)
      yPosition += 5

      // Add section content
      addText(section.content, 12)
      yPosition += 5

      // Add image placeholder if image prompt exists
      if (section.imagePrompt) {
        // Check if we need a new page for the image
        if (yPosition + 60 > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }

        // Draw image placeholder
        doc.setDrawColor(200, 200, 200)
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, yPosition, maxWidth, 50, "FD")

        // Add image description
        doc.setFontSize(10)
        doc.setFont("helvetica", "italic")
        const imageText = `[Image: ${section.imagePrompt}]`
        const textWidth = doc.getTextWidth(imageText)
        doc.text(imageText, margin + (maxWidth - textWidth) / 2, yPosition + 25)

        yPosition += 60
      }

      yPosition += 10
    })

    // Add conclusion
    addText("Conclusion", 16, true)
    yPosition += 5
    addText(content.conclusion, 12)

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    // Save to database
    const { data: pdfRecord, error: dbError } = await supabase
      .from("pdf_generations")
      .insert({
        user_id: user.id,
        topic,
        content: JSON.stringify(content),
        status: "completed",
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      throw new Error("Failed to save PDF record")
    }

    // Create download URL (in a real app, you'd upload to storage)
    const base64PDF = pdfBuffer.toString("base64")
    const downloadUrl = `data:application/pdf;base64,${base64PDF}`

    return NextResponse.json({
      message: "PDF generated successfully",
      downloadUrl,
      pdfId: pdfRecord.id,
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF. Please try again." }, { status: 500 })
  }
}
