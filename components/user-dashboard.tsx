"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  GraduationCap,
  Brain,
  FileText,
  MessageSquare,
  LogOut,
  User,
  Settings,
  BarChart3,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { LineChart, Line, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts"

interface UserDashboardProps {
  user: SupabaseUser
}

interface UserStats {
  mcqCount: number
  pdfCount: number
  chatCount: number
  quizAttempts: number
  avgScore: number
  recentActivity: any[]
  topicDistribution: any[]
  weeklyActivity: any[]
}

const COLORS = ["#15803d", "#84cc16", "#059669", "#10b981", "#dc2626"]

export function UserDashboard({ user }: UserDashboardProps) {
  const [stats, setStats] = useState<UserStats>({
    mcqCount: 0,
    pdfCount: 0,
    chatCount: 0,
    quizAttempts: 0,
    avgScore: 0,
    recentActivity: [],
    topicDistribution: [],
    weeklyActivity: [],
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      const [mcqResult, pdfResult, chatResult, attemptsResult] = await Promise.all([
        supabase.from("mcq_questions").select("*").eq("user_id", user.id),
        supabase.from("pdf_generations").select("*").eq("user_id", user.id),
        supabase.from("chat_messages").select("*").eq("user_id", user.id),
        supabase.from("mcq_attempts").select("*").eq("user_id", user.id),
      ])

      const mcqs = mcqResult.data || []
      const pdfs = pdfResult.data || []
      const chats = chatResult.data || []
      const attempts = attemptsResult.data || []

      // Calculate average score
      const avgScore =
        attempts.length > 0 ? attempts.reduce((sum, attempt) => sum + attempt.score_percentage, 0) / attempts.length : 0

      // Recent activity (last 10 items)
      const allActivity = [
        ...mcqs.map((item) => ({ ...item, type: "MCQ Generated", icon: Brain })),
        ...pdfs.map((item) => ({ ...item, type: "PDF Generated", icon: FileText })),
        ...chats.map((item) => ({ ...item, type: "Chat Message", icon: MessageSquare })),
        ...attempts.map((item) => ({ ...item, type: "Quiz Completed", icon: BarChart3 })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      // Topic distribution from MCQs and attempts
      const topicStats = [...mcqs, ...attempts].reduce((acc: any, item) => {
        const topic = item.topic || "Other"
        acc[topic] = (acc[topic] || 0) + 1
        return acc
      }, {})

      const topicDistribution = Object.entries(topicStats).map(([topic, count]) => ({
        topic,
        count,
      }))

      // Weekly activity for the last 7 days
      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split("T")[0]

        const dayActivities = allActivity.filter((activity) => activity.created_at.startsWith(dateStr))

        return {
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          activities: dayActivities.length,
        }
      }).reverse()

      setStats({
        mcqCount: mcqs.length,
        pdfCount: pdfs.length,
        chatCount: chats.length,
        quizAttempts: attempts.length,
        avgScore,
        recentActivity: allActivity,
        topicDistribution,
        weeklyActivity,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const logoutAction = (await import("@/app/auth/actions")).logoutAction
    await logoutAction()
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">Excellent</Badge>
    if (score >= 80) return <Badge className="bg-green-500">Good</Badge>
    if (score >= 70) return <Badge className="bg-yellow-500">Average</Badge>
    if (score >= 60) return <Badge className="bg-orange-500">Below Average</Badge>
    return <Badge variant="destructive">Needs Improvement</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Teacher AI</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <User className="h-4 w-4" />
                Profile
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button onClick={handleLogout} variant="outline" className="gap-2 bg-transparent">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tools">AI Tools</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MCQs Created</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.mcqCount}</div>
                  <p className="text-xs text-muted-foreground">Questions generated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PDFs Generated</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.pdfCount}</div>
                  <p className="text-xs text-muted-foreground">Documents created</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.quizAttempts}</div>
                  <p className="text-xs text-muted-foreground">Quizzes completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.avgScore.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Quiz performance</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Weekly Activity
                  </CardTitle>
                  <CardDescription>Your activity over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stats.weeklyActivity}>
                      <Line type="monotone" dataKey="activities" stroke="#15803d" strokeWidth={2} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border rounded p-2 text-sm">
                                <p>{`${label}: ${payload[0].value} activities`}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Topic Distribution
                  </CardTitle>
                  <CardDescription>Your content by subject area</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.topicDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ topic, percent }) => `${topic} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
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
            </div>

            {/* Performance Overview */}
            {stats.quizAttempts > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Performance Overview
                  </CardTitle>
                  <CardDescription>Your quiz performance summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">Overall Performance</div>
                      <div className="text-sm text-muted-foreground">Based on {stats.quizAttempts} quiz attempts</div>
                    </div>
                    <div className="text-right">
                      {getPerformanceBadge(stats.avgScore)}
                      <div className="text-2xl font-bold text-primary mt-1">{stats.avgScore.toFixed(1)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Choose Your AI Tool</h2>
              <p className="text-muted-foreground text-lg">Select from our powerful AI-driven educational tools</p>
            </div>

            {/* Tools Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <Brain className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-xl">MCQ Generator</CardTitle>
                  <CardDescription>Create intelligent multiple-choice questions on any topic using AI</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4 text-sm text-muted-foreground">You've created {stats.mcqCount} questions</div>
                  <Button asChild className="w-full">
                    <Link href="/mcq-generator">Generate MCQs</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <FileText className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-xl">PDF Generator</CardTitle>
                  <CardDescription>
                    Generate comprehensive educational materials with images and detailed content
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4 text-sm text-muted-foreground">You've generated {stats.pdfCount} documents</div>
                  <Button asChild className="w-full">
                    <Link href="/pdf-generator">Generate PDF</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-xl">AI Chat</CardTitle>
                  <CardDescription>
                    Interactive AI assistant for educational queries and teaching support
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4 text-sm text-muted-foreground">You've had {stats.chatCount} conversations</div>
                  <Button asChild className="w-full">
                    <Link href="/chat">Start Chat</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity, index) => {
                      const Icon = activity.icon
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Icon className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{activity.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {activity.topic || activity.message?.substring(0, 50) + "..." || "No details"}
                              {activity.score_percentage && (
                                <span
                                  className={`ml-2 font-medium ${
                                    activity.score_percentage >= 70 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  ({activity.score_percentage.toFixed(1)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity. Start using the AI tools to see your activity here!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Learning Progress
                  </CardTitle>
                  <CardDescription>Track your educational journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Content Created</span>
                      <span className="font-bold">{stats.mcqCount + stats.pdfCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Quizzes Completed</span>
                      <span className="font-bold">{stats.quizAttempts}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>AI Conversations</span>
                      <span className="font-bold">{stats.chatCount}</span>
                    </div>
                    {stats.quizAttempts > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Average Performance</span>
                        <div className="flex items-center gap-2">
                          {getPerformanceBadge(stats.avgScore)}
                          <span className="font-bold">{stats.avgScore.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Goals & Achievements
                  </CardTitle>
                  <CardDescription>Your milestones and targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span>First MCQ Created</span>
                      </div>
                      {stats.mcqCount > 0 ? (
                        <Badge className="bg-green-600">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span>First PDF Generated</span>
                      </div>
                      {stats.pdfCount > 0 ? (
                        <Badge className="bg-green-600">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span>Quiz Master (10+ attempts)</span>
                      </div>
                      {stats.quizAttempts >= 10 ? (
                        <Badge className="bg-green-600">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">{stats.quizAttempts}/10</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span>High Achiever (80%+ avg)</span>
                      </div>
                      {stats.avgScore >= 80 && stats.quizAttempts > 0 ? (
                        <Badge className="bg-green-600">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {stats.quizAttempts > 0 ? `${stats.avgScore.toFixed(1)}%` : "No attempts"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
