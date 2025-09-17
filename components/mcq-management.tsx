"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Brain, Search, Plus, Eye, Trash2, BarChart3, Target, TrendingUp, CheckCircle, XCircle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface MCQQuestion {
  id: string
  user_id: string
  topic: string
  question: string
  options: string[]
  correct_answer: string
  difficulty: string
  created_at: string
  user_email?: string
  attempt_count?: number
  success_rate?: number
}

interface MCQAttempt {
  id: string
  user_id: string
  topic: string
  difficulty: string
  total_questions: number
  correct_answers: number
  score_percentage: number
  questions_data: any
  created_at: string
}

interface MCQStats {
  totalQuestions: number
  totalAttempts: number
  avgSuccessRate: number
  topicDistribution: any[]
  difficultyDistribution: any[]
  recentAttempts: MCQAttempt[]
}

const COLORS = ["#15803d", "#84cc16", "#059669", "#10b981", "#dc2626", "#f59e0b"]

export function MCQManagement() {
  const [questions, setQuestions] = useState<MCQQuestion[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<MCQQuestion[]>([])
  const [stats, setStats] = useState<MCQStats>({
    totalQuestions: 0,
    totalAttempts: 0,
    avgSuccessRate: 0,
    topicDistribution: [],
    difficultyDistribution: [],
    recentAttempts: [],
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [topicFilter, setTopicFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [selectedQuestion, setSelectedQuestion] = useState<MCQQuestion | null>(null)
  const [showQuestionDetails, setShowQuestionDetails] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    topic: "",
    question: "",
    options: ["", "", "", ""],
    correct_answer: "",
    difficulty: "medium",
  })
  const supabase = createClient()

  useEffect(() => {
    fetchMCQData()
  }, [])

  useEffect(() => {
    filterQuestions()
  }, [questions, searchTerm, topicFilter, difficultyFilter])

  const fetchMCQData = async () => {
    try {
      const [questionsResult, attemptsResult, usersResult] = await Promise.all([
        supabase.from("mcq_questions").select("*").order("created_at", { ascending: false }),
        supabase.from("mcq_attempts").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("id, email"),
      ])

      const questionsWithStats = (questionsResult.data || []).map((question: any) => {
        const user = usersResult.data?.find((u) => u.id === question.user_id)
        const questionAttempts =
          attemptsResult.data?.filter((attempt) =>
            attempt.questions_data?.some((q: any) => q.question === question.question),
          ) || []

        const correctAttempts = questionAttempts.filter((attempt) => {
          const questionInAttempt = attempt.questions_data?.find((q: any) => q.question === question.question)
          return questionInAttempt?.user_answer === question.correct_answer
        })

        return {
          ...question,
          user_email: user?.email || "Unknown",
          attempt_count: questionAttempts.length,
          success_rate: questionAttempts.length > 0 ? (correctAttempts.length / questionAttempts.length) * 100 : 0,
        }
      })

      // Calculate stats
      const topicStats = questionsWithStats.reduce((acc: any, question) => {
        acc[question.topic] = (acc[question.topic] || 0) + 1
        return acc
      }, {})

      const difficultyStats = questionsWithStats.reduce((acc: any, question) => {
        acc[question.difficulty] = (acc[question.difficulty] || 0) + 1
        return acc
      }, {})

      const topicDistribution = Object.entries(topicStats).map(([topic, count]) => ({
        topic,
        count,
      }))

      const difficultyDistribution = Object.entries(difficultyStats).map(([difficulty, count]) => ({
        difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        count,
      }))

      const avgSuccessRate =
        questionsWithStats.length > 0
          ? questionsWithStats.reduce((sum, q) => sum + q.success_rate, 0) / questionsWithStats.length
          : 0

      setQuestions(questionsWithStats)
      setStats({
        totalQuestions: questionsWithStats.length,
        totalAttempts: attemptsResult.data?.length || 0,
        avgSuccessRate,
        topicDistribution,
        difficultyDistribution,
        recentAttempts: attemptsResult.data?.slice(0, 10) || [],
      })
    } catch (error) {
      console.error("Error fetching MCQ data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterQuestions = () => {
    const filtered = questions.filter((question) => {
      const matchesSearch =
        question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.topic.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTopic = topicFilter === "all" || question.topic === topicFilter
      const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter

      return matchesSearch && matchesTopic && matchesDifficulty
    })

    setFilteredQuestions(filtered)
  }

  const handleCreateQuestion = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { error } = await supabase.from("mcq_questions").insert({
        user_id: user.user.id,
        topic: newQuestion.topic,
        question: newQuestion.question,
        options: newQuestion.options,
        correct_answer: newQuestion.correct_answer,
        difficulty: newQuestion.difficulty,
      })

      if (error) throw error

      setShowCreateDialog(false)
      setNewQuestion({
        topic: "",
        question: "",
        options: ["", "", "", ""],
        correct_answer: "",
        difficulty: "medium",
      })
      fetchMCQData()
    } catch (error) {
      console.error("Error creating question:", error)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase.from("mcq_questions").delete().eq("id", questionId)
      if (error) throw error
      fetchMCQData()
    } catch (error) {
      console.error("Error deleting question:", error)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      easy: "bg-green-500",
      medium: "bg-yellow-500",
      hard: "bg-red-500",
    }
    return <Badge className={variants[difficulty as keyof typeof variants] || "bg-gray-500"}>{difficulty}</Badge>
  }

  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-600">Excellent</Badge>
    if (rate >= 60) return <Badge className="bg-yellow-600">Good</Badge>
    if (rate >= 40) return <Badge className="bg-orange-600">Fair</Badge>
    return <Badge variant="destructive">Poor</Badge>
  }

  const uniqueTopics = [...new Set(questions.map((q) => q.topic))]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading MCQ data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">Generated questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">Total attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.avgSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average correct rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Topics</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{uniqueTopics.length}</div>
            <p className="text-xs text-muted-foreground">Different subjects</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="attempts">Recent Attempts</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>MCQ Question Bank</CardTitle>
                  <CardDescription>Manage and monitor all MCQ questions</CardDescription>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New MCQ Question</DialogTitle>
                      <DialogDescription>Add a new multiple choice question to the bank</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="topic">Topic</Label>
                          <Input
                            id="topic"
                            value={newQuestion.topic}
                            onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                            placeholder="e.g., Mathematics, Science"
                          />
                        </div>
                        <div>
                          <Label htmlFor="difficulty">Difficulty</Label>
                          <Select
                            value={newQuestion.difficulty}
                            onValueChange={(value) => setNewQuestion({ ...newQuestion, difficulty: value })}
                          >
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
                      </div>
                      <div>
                        <Label htmlFor="question">Question</Label>
                        <Textarea
                          id="question"
                          value={newQuestion.question}
                          onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                          placeholder="Enter your question here..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Options</Label>
                        <div className="space-y-2">
                          {newQuestion.options.map((option, index) => (
                            <Input
                              key={index}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...newQuestion.options]
                                newOptions[index] = e.target.value
                                setNewQuestion({ ...newQuestion, options: newOptions })
                              }}
                              placeholder={`Option ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="correct">Correct Answer</Label>
                        <Select
                          value={newQuestion.correct_answer}
                          onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            {newQuestion.options.map((option, index) => (
                              <SelectItem key={index} value={option} disabled={!option}>
                                {option || `Option ${index + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateQuestion}>Create Question</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={topicFilter} onValueChange={setTopicFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {uniqueTopics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Questions Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={question.question}>
                          {question.question}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{question.topic}</Badge>
                      </TableCell>
                      <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getSuccessRateBadge(question.success_rate || 0)}
                          <div className="text-sm text-muted-foreground">
                            {(question.success_rate || 0).toFixed(1)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{question.attempt_count || 0}</div>
                          <div className="text-xs text-muted-foreground">attempts</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{question.user_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQuestion(question)
                              setShowQuestionDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredQuestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No questions found matching your criteria.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Topic Distribution</CardTitle>
                <CardDescription>Questions by subject area</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.topicDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ topic, percent }) => `${topic} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.topicDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Difficulty Distribution</CardTitle>
                <CardDescription>Questions by difficulty level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.difficultyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="difficulty" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#15803d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attempts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Quiz Attempts</CardTitle>
              <CardDescription>Latest quiz completions and scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentAttempts.map((attempt, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${attempt.score_percentage >= 70 ? "bg-green-100" : "bg-red-100"}`}
                      >
                        {attempt.score_percentage >= 70 ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{attempt.topic}</div>
                        <div className="text-sm text-muted-foreground">
                          {attempt.correct_answers}/{attempt.total_questions} correct • {attempt.difficulty} difficulty
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${attempt.score_percentage >= 70 ? "text-green-600" : "text-red-600"}`}
                      >
                        {attempt.score_percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Details Dialog */}
      <Dialog open={showQuestionDetails} onOpenChange={setShowQuestionDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>Complete information about this MCQ question</DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Topic</Label>
                <div className="mt-1">
                  <Badge variant="outline">{selectedQuestion.topic}</Badge>
                  {getDifficultyBadge(selectedQuestion.difficulty)}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Question</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">{selectedQuestion.question}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Options</Label>
                <div className="mt-1 space-y-2">
                  {selectedQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded border ${option === selectedQuestion.correct_answer ? "bg-green-50 border-green-200" : "bg-background"}`}
                    >
                      <div className="flex items-center gap-2">
                        {option === selectedQuestion.correct_answer && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        <span>
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Success Rate</Label>
                  <div className="mt-1">
                    {getSuccessRateBadge(selectedQuestion.success_rate || 0)}
                    <div className="text-sm text-muted-foreground mt-1">
                      {(selectedQuestion.success_rate || 0).toFixed(1)}% correct
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Attempts</Label>
                  <div className="mt-1">
                    <div className="text-lg font-bold">{selectedQuestion.attempt_count || 0}</div>
                    <div className="text-sm text-muted-foreground">total attempts</div>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Created By</Label>
                <div className="mt-1 text-sm">{selectedQuestion.user_email}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Created Date</Label>
                <div className="mt-1 text-sm">{new Date(selectedQuestion.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
