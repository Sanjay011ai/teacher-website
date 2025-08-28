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
        num_predict: 2000,
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

    const { topic, difficulty, numQuestions } = await request.json()

    if (!topic || !difficulty || !numQuestions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create prompt for Ollama
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

    const responseText = await callOllama([
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
