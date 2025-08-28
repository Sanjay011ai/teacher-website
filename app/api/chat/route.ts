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
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Create educational-focused system prompt
    const systemPrompt = `You are an expert AI teacher and educational assistant. Your role is to:

1. Provide clear, accurate, and educational responses
2. Adapt explanations to appropriate learning levels
3. Use examples and analogies to make concepts easier to understand
4. Encourage learning and curiosity
5. Provide step-by-step explanations when helpful
6. Suggest related topics or follow-up questions
7. Be patient, supportive, and encouraging

Guidelines:
- Keep responses informative but concise
- Use simple language when explaining complex concepts
- Provide practical examples
- Encourage critical thinking
- Be supportive and positive
- If asked about lesson planning, provide structured, practical advice
- For math problems, show step-by-step solutions
- For science topics, explain underlying principles
- For history, provide context and connections

Always aim to educate and inspire learning.`

    const response = await callGemini([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ])

    if (!response) {
      throw new Error("No response from AI")
    }

    // Save chat message to database
    const { error: dbError } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      message,
      response,
    })

    if (dbError) {
      console.error("Database error:", dbError)
      // Continue even if database save fails
    }

    return NextResponse.json({
      response,
      message: "Chat response generated successfully",
    })
  } catch (error) {
    console.error("Error in chat:", error)
    return NextResponse.json(
      {
        error: "I'm having trouble responding right now. Please try again.",
      },
      { status: 500 },
    )
  }
}
