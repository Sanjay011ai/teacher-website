import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function callOllama(messages: Array<{ role: string; content: string }>) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral",
      messages: messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }

  const data = await response.json()
  return data.message?.content || ""
}

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

    const response = await callOllama([
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
