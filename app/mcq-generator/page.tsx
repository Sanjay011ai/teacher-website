"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RouteGuard } from "@/components/route-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { GraduationCap, Brain, ArrowLeft, Loader2, CheckCircle, XCircle, History } from "lucide-react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

interface MCQQuestion {
  id?: string
  question: string
  options: string[]
  correct_answer: number
  topic: string
  difficulty: string
  created_at?: string
}

interface MCQAttempt {
  id: string
  topic: string
  difficulty: string
  total_questions: number
  correct_answers: number
  score_percentage: number
  created_at: string
  questions_data: {
    question: string
    options: string[]
    correct_answer: number
    user_answer: number
  }[]
}

export default function MCQGeneratorPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [numQuestions, setNumQuestions] = useState("5")
  const [generatedQuestions, setGeneratedQuestions] = useState<MCQQuestion[]>([])
  const [previousQuestions, setPreviousQuestions] = useState<MCQQuestion[]>([])
  const [quizAttempts, setQuizAttempts] = useState<MCQAttempt[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyView, setHistoryView] = useState<"questions" | "attempts">("attempts")
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({})
  const [showResults, setShowResults] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchPreviousQuestions()
    fetchQuizAttempts()
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

  const fetchPreviousQuestions = async () => {
    const { data, error } = await supabase
      .from("mcq_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setPreviousQuestions(data)
    }
  }

  const fetchQuizAttempts = async () => {
    const { data, error } = await supabase
      .from("mcq_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setQuizAttempts(data)
    }
  }

  const generateMCQs = async () => {
    if (!topic.trim()) return

    setGenerating(true)
    try {
      const response = await fetch("/api/generate-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          numQuestions: Number.parseInt(numQuestions),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate MCQs")
      }

      const data = await response.json()
      setGeneratedQuestions(data.questions)
      setSelectedAnswers({})
      setShowResults(false)

      // Save to database
      await saveMCQsToDatabase(data.questions)
      await fetchPreviousQuestions()
    } catch (error) {
      console.error("Error generating MCQs:", error)
    } finally {
      setGenerating(false)
    }
  }

  const saveMCQsToDatabase = async (questions: MCQQuestion[]) => {
    const questionsToSave = questions.map((q) => ({
      topic,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      difficulty,
      user_id: user?.id,
    }))

    await supabase.from("mcq_questions").insert(questionsToSave)
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }))
  }

  const checkAnswers = async () => {
    setShowResults(true)

    // Calculate score
    const { correct, total } = getScore()
    const scorePercentage = Math.round((correct / total) * 100)

    // Prepare questions data with user answers
    const questionsData = generatedQuestions.map((question, index) => ({
      question: question.question,
      options: question.options,
      correct_answer: question.correct_answer,
      user_answer: selectedAnswers[index] ?? -1,
    }))

    // Save quiz attempt to database
    try {
      await supabase.from("mcq_attempts").insert({
        user_id: user?.id,
        topic,
        difficulty,
        total_questions: total,
        correct_answers: correct,
        score_percentage: scorePercentage,
        questions_data: questionsData,
      })

      // Refresh attempts history
      await fetchQuizAttempts()
    } catch (error) {
      console.error("Error saving quiz attempt:", error)
    }
  }

  const getScore = () => {
    let correct = 0
    generatedQuestions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correct++
      }
    })
    return { correct, total: generatedQuestions.length }
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
                  <h1 className="text-xl font-bold text-primary">MCQ Generator</h1>
                  <p className="text-sm text-muted-foreground">Create intelligent multiple-choice questions</p>
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
                    <Brain className="h-5 w-5" />
                    Generate MCQs
                  </CardTitle>
                  <CardDescription>
                    Enter a topic and let AI create intelligent multiple-choice questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Textarea
                      id="topic"
                      placeholder="e.g., Photosynthesis in plants, World War II, JavaScript functions..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numQuestions">Number of Questions</Label>
                    <Select value={numQuestions} onValueChange={setNumQuestions}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Questions</SelectItem>
                        <SelectItem value="5">5 Questions</SelectItem>
                        <SelectItem value="10">10 Questions</SelectItem>
                        <SelectItem value="15">15 Questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={generateMCQs} disabled={!topic.trim() || generating} className="w-full">
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate MCQs
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* History Panel */}
              {showHistory && (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">History</CardTitle>
                        <CardDescription>Your quiz attempts and generated questions</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant={historyView === "attempts" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setHistoryView("attempts")}
                        >
                          Attempts
                        </Button>
                        <Button
                          variant={historyView === "questions" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setHistoryView("questions")}
                        >
                          Questions
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {historyView === "attempts"
                        ? quizAttempts.map((attempt) => (
                            <div key={attempt.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="secondary">{attempt.difficulty}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(attempt.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-medium text-sm">{attempt.topic}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {attempt.correct_answers}/{attempt.total_questions} questions
                                </span>
                                <Badge
                                  variant={attempt.score_percentage >= 70 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {attempt.score_percentage}%
                                </Badge>
                              </div>
                            </div>
                          ))
                        : previousQuestions.map((mcq) => (
                            <div key={mcq.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="secondary">{mcq.difficulty}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(mcq.created_at!).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-medium text-sm">{mcq.topic}</p>
                              <p className="text-xs text-muted-foreground mt-1">{mcq.question.substring(0, 80)}...</p>
                            </div>
                          ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Generated Questions */}
            <div className="lg:col-span-2">
              {generatedQuestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Generated Questions</CardTitle>
                        <CardDescription>
                          Topic: {topic} • Difficulty: {difficulty} • {generatedQuestions.length} questions
                        </CardDescription>
                      </div>
                      {Object.keys(selectedAnswers).length === generatedQuestions.length && !showResults && (
                        <Button onClick={checkAnswers} className="gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Check Answers
                        </Button>
                      )}
                    </div>
                    {showResults && (
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary mb-2">
                            {getScore().correct}/{getScore().total}
                          </div>
                          <div className="text-lg font-semibold mb-1">
                            {Math.round((getScore().correct / getScore().total) * 100)}%
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getScore().correct === getScore().total
                              ? "Perfect score! 🎉"
                              : getScore().correct / getScore().total >= 0.7
                                ? "Great job! 👏"
                                : "Keep practicing! 💪"}
                          </p>
                          <Badge
                            variant={getScore().correct / getScore().total >= 0.7 ? "default" : "secondary"}
                            className="mt-2"
                          >
                            Quiz Completed & Saved
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {generatedQuestions.map((question, questionIndex) => (
                      <div key={questionIndex} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">
                            {questionIndex + 1}
                          </Badge>
                          <div className="flex-1">
                            <h3 className="font-medium text-balance">{question.question}</h3>
                          </div>
                        </div>

                        <div className="ml-8 space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const isSelected = selectedAnswers[questionIndex] === optionIndex
                            const isCorrect = optionIndex === question.correct_answer
                            const showCorrectAnswer = showResults

                            return (
                              <div
                                key={optionIndex}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? showCorrectAnswer
                                      ? isCorrect
                                        ? "bg-green-50 border-green-200"
                                        : "bg-red-50 border-red-200"
                                      : "bg-primary/10 border-primary/20"
                                    : showCorrectAnswer && isCorrect
                                      ? "bg-green-50 border-green-200"
                                      : "hover:bg-muted/50"
                                }`}
                                onClick={() => !showResults && handleAnswerSelect(questionIndex, optionIndex)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {String.fromCharCode(65 + optionIndex)}.
                                    </span>
                                    <span>{option}</span>
                                  </span>
                                  {showResults && (
                                    <>
                                      {isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                                      {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {generatedQuestions.length === 0 && !generating && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Questions Generated Yet</h3>
                    <p className="text-muted-foreground">
                      Enter a topic and click "Generate MCQs" to create intelligent multiple-choice questions.
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
