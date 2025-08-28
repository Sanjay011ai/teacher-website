import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import jsPDF from "jspdf"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get PDF record from database
    const { data: pdfRecord, error: dbError } = await supabase
      .from("pdf_generations")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (dbError || !pdfRecord) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    const content = JSON.parse(pdfRecord.content)

    // Regenerate PDF (in a real app, you'd store the actual PDF file)
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
      addText(section.heading, 16, true)
      yPosition += 5
      addText(section.content, 12)
      yPosition += 5

      if (section.imagePrompt) {
        if (yPosition + 60 > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }

        doc.setDrawColor(200, 200, 200)
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, yPosition, maxWidth, 50, "FD")

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

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfRecord.topic.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error downloading PDF:", error)
    return NextResponse.json({ error: "Failed to download PDF" }, { status: 500 })
  }
}
