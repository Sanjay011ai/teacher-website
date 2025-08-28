import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyAvFsPD4ghOc-igDqyBecZTM5DtK3Jf3xY")

async function callGemini(messages: Array<{ role: string; content: string }>) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Convert messages to Gemini format
    const lastMessage = messages[messages.length - 1]
    const systemMessage = messages.find((m) => m.role === "system")

    // Combine system prompt with user message
    const prompt = systemMessage ? `${systemMessage.content}\n\nUser: ${lastMessage.content}` : lastMessage.content

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error("Gemini API error:", error)
    throw new Error(`Gemini API error: ${error}`)
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] PDF Content API: Starting request")

  try {
    // Check authentication
    console.log("[v0] PDF Content API: Checking authentication")
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] PDF Content API: Authentication failed", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] PDF Content API: User authenticated:", user.id)

    const { topic } = await request.json()
    console.log("[v0] PDF Content API: Topic received:", topic)

    if (!topic) {
      console.log("[v0] PDF Content API: No topic provided")
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    // Create prompt for comprehensive content generation
    const prompt = `Create a comprehensive educational document about "${topic}". 

Structure the content as follows:
1. An engaging title
2. 4-6 main sections with detailed explanations
3. Each section should include relevant images (provide image descriptions)
4. A conclusion that summarizes key points

Requirements:
- Write in an educational, informative tone
- Include detailed explanations suitable for learning
- Make it comprehensive but accessible
- Each section should be substantial (150-200 words)
- Suggest relevant images for each section
- Include interesting facts and examples

Format your response as JSON with this exact structure:
{
  "title": "Document title here",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed content for this section...",
      "imagePrompt": "Description of relevant image for this section"
    }
  ],
  "conclusion": "Comprehensive conclusion summarizing the key points..."
}

Topic: ${topic}`

    console.log("[v0] PDF Content API: Calling Gemini API")

    const responseText = await callGemini([
      {
        role: "system",
        content:
          "You are an expert educator and content writer. Create comprehensive, well-structured educational materials that are informative, engaging, and suitable for learning. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])

    console.log("[v0] PDF Content API: Gemini API response received")

    if (!responseText) {
      console.log("[v0] PDF Content API: No response from AI")
      throw new Error("No response from AI")
    }

    console.log("[v0] PDF Content API: Response text length:", responseText.length)

    // Parse the JSON response
    let content
    try {
      console.log("[v0] PDF Content API: Parsing JSON response")

      // Try to parse the entire response first
      try {
        content = JSON.parse(responseText)
      } catch {
        // If that fails, try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.log("[v0] PDF Content API: No JSON found in response:", responseText.substring(0, 200))
          throw new Error("No JSON object found in response")
        }
        content = JSON.parse(jsonMatch[0])
      }

      console.log("[v0] PDF Content API: JSON parsed successfully")
    } catch (parseError) {
      console.error("[v0] PDF Content API: Failed to parse AI response:", parseError)
      console.error("[v0] PDF Content API: Raw response:", responseText.substring(0, 500))
      throw new Error("Invalid JSON response from AI")
    }

    // Validate the content format
    console.log("[v0] PDF Content API: Validating content format")
    if (!content.title || !Array.isArray(content.sections) || !content.conclusion) {
      console.log("[v0] PDF Content API: Invalid content format:", {
        hasTitle: !!content.title,
        hasSections: Array.isArray(content.sections),
        hasConclusion: !!content.conclusion,
      })
      throw new Error("Invalid content format")
    }

    // Validate sections
    content.sections.forEach((section: any, index: number) => {
      if (!section.heading || !section.content) {
        console.log("[v0] PDF Content API: Invalid section at index", index, section)
        throw new Error(`Invalid section format at index ${index}`)
      }
    })

    console.log("[v0] PDF Content API: Content validation successful")
    console.log("[v0] PDF Content API: Generated", content.sections.length, "sections")

    return NextResponse.json({
      content,
      message: "Content generated successfully",
    })
  } catch (error) {
    console.error("[v0] PDF Content API: Error generating content:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate content. Please try again.",
      },
      { status: 500 },
    )
  }
}
