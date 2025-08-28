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
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { topic, difficulty, numQuestions } = await request.json()

    if (!topic || !difficulty || !numQuestions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create prompt for Gemini
    const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.

Requirements:
- Each question should have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Questions should be educational and well-structured
- Avoid ambiguous or trick questions
- Make sure options are plausible but clearly distinguishable

Format your response as a JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0
  }
]

The correct_answer should be the index (0-3) of the correct option in the options array.

Topic: ${topic}
Difficulty: ${difficulty}
Number of questions: ${numQuestions}`

    const responseText = await callGemini([
      {
        role: "system",
        content:
          "You are an expert educator and question writer. Generate high-quality multiple-choice questions that are educational, clear, and appropriate for the specified difficulty level. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])

    if (!responseText) {
      throw new Error("No response from AI")
    }

    // Parse the JSON response
    let questions
    try {
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("No JSON array found in response")
      }
      questions = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText)
      throw new Error("Invalid JSON response from AI")
    }

    // Validate the questions format
    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array")
    }

    const validatedQuestions = questions.map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correct_answer !== "number") {
        throw new Error(`Invalid question format at index ${index}`)
      }

      if (q.correct_answer < 0 || q.correct_answer > 3) {
        throw new Error(`Invalid correct_answer at index ${index}`)
      }

      return {
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        topic,
        difficulty,
      }
    })

    return NextResponse.json({
      questions: validatedQuestions,
      message: `Generated ${validatedQuestions.length} MCQ questions successfully`,
    })
  } catch (error) {
    console.error("Error generating MCQs:", error)
    return NextResponse.json({ error: "Failed to generate MCQs. Please try again." }, { status: 500 })
  }
}
