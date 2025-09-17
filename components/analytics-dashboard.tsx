"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Calendar, Award, Target } from "lucide-react"

interface AnalyticsData {
  dailyActivity: any[]
  topicPerformance: any[]
  difficultyBreakdown: any[]
  userEngagement: any[]
  monthlyTrends: any[]
  scoreDistribution: any[]
}

const COLORS = ["#15803d", "#84cc16", "#059669", "#10b981", "#dc2626", "#f59e0b", "#8b5cf6"]

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({
    dailyActivity: [],
    topicPerformance: [],
    difficultyBreakdown: [],
    userEngagement: [],
    monthlyTrends: [],
    scoreDistribution: [],
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")
  const supabase = createClient()

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      const [mcqResult, attemptsResult, chatResult, pdfResult] = await Promise.all([
        supabase.from("mcq_questions").select("*"),
        supabase.from("mcq_attempts").select("*"),
        supabase.from("chat_messages").select("*"),
        supabase.from("pdf_generations").select("*"),
      ])

      // Process daily activity data
      const dailyActivity = processActivityByDay([
        ...(mcqResult.data || []),
        ...(attemptsResult.data || []),
        ...(chatResult.data || []),
        ...(pdfResult.data || []),
      ])

      // Process topic performance
      const topicPerformance = processTopicPerformance(attemptsResult.data || [])

      // Process difficulty breakdown
      const difficultyBreakdown = processDifficultyBreakdown(attemptsResult.data || [])

      // Process user engagement
      const userEngagement = processUserEngagement([
        ...(mcqResult.data || []),
        ...(attemptsResult.data || []),
        ...(chatResult.data || []),
        ...(pdfResult.data || []),
      ])

      // Process monthly trends
      const monthlyTrends = processMonthlyTrends([
        ...(mcqResult.data || []),
        ...(attemptsResult.data || []),
        ...(chatResult.data || []),
        ...(pdfResult.data || []),
      ])

      // Process score distribution
      const scoreDistribution = processScoreDistribution(attemptsResult.data || [])

      setData({
        dailyActivity,
        topicPerformance,
        difficultyBreakdown,
        userEngagement,
        monthlyTrends,
        scoreDistribution,
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoading(false)
    }
  }

  const processActivityByDay = (activities: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split("T")[0]
    }).reverse()

    return last7Days.map((date) => {
      const dayActivities = activities.filter((activity) => activity.created_at?.startsWith(date))

      return {
        date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        mcqs: dayActivities.filter((a) => a.topic && a.question).length,
        quizzes: dayActivities.filter((a) => a.score_percentage !== undefined).length,
        chats: dayActivities.filter((a) => a.message && a.response).length,
        pdfs: dayActivities.filter((a) => a.content && !a.message).length,
        total: dayActivities.length,
      }
    })
  }

  const processTopicPerformance = (attempts: any[]) => {
    const topicStats = attempts.reduce((acc: any, attempt) => {
      const topic = attempt.topic || "Other"
      if (!acc[topic]) {
        acc[topic] = { attempts: 0, totalScore: 0, count: 0 }
      }
      acc[topic].attempts += 1
      acc[topic].totalScore += attempt.score_percentage
      acc[topic].count += 1
      return acc
    }, {})

    return Object.entries(topicStats)
      .map(([topic, stats]: [string, any]) => ({
        topic,
        attempts: stats.attempts,
        avgScore: (stats.totalScore / stats.count).toFixed(1),
        performance: stats.totalScore / stats.count >= 70 ? "Good" : "Needs Improvement",
      }))
      .sort((a, b) => b.attempts - a.attempts)
  }

  const processDifficultyBreakdown = (attempts: any[]) => {
    const difficultyStats = attempts.reduce((acc: any, attempt) => {
      const difficulty = attempt.difficulty || "medium"
      if (!acc[difficulty]) {
        acc[difficulty] = { count: 0, totalScore: 0 }
      }
      acc[difficulty].count += 1
      acc[difficulty].totalScore += attempt.score_percentage
      return acc
    }, {})

    return Object.entries(difficultyStats).map(([difficulty, stats]: [string, any]) => ({
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      attempts: stats.count,
      avgScore: (stats.totalScore / stats.count).toFixed(1),
      value: stats.count,
    }))
  }

  const processUserEngagement = (activities: any[]) => {
    const userStats = activities.reduce((acc: any, activity) => {
      const userId = activity.user_id
      if (!acc[userId]) {
        acc[userId] = { mcqs: 0, quizzes: 0, chats: 0, pdfs: 0 }
      }

      if (activity.question) acc[userId].mcqs += 1
      else if (activity.score_percentage !== undefined) acc[userId].quizzes += 1
      else if (activity.message) acc[userId].chats += 1
      else if (activity.content) acc[userId].pdfs += 1

      return acc
    }, {})

    return Object.entries(userStats)
      .map(([userId, stats]: [string, any]) => ({
        userId: userId.slice(0, 8),
        ...stats,
        total: stats.mcqs + stats.quizzes + stats.chats + stats.pdfs,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }

  const processMonthlyTrends = (activities: any[]) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      return date.toISOString().slice(0, 7)
    }).reverse()

    return last6Months.map((month) => {
      const monthActivities = activities.filter((activity) => activity.created_at?.startsWith(month))

      return {
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short" }),
        activities: monthActivities.length,
        users: new Set(monthActivities.map((a) => a.user_id)).size,
      }
    })
  }

  const processScoreDistribution = (attempts: any[]) => {
    const ranges = [
      { range: "0-20%", min: 0, max: 20 },
      { range: "21-40%", min: 21, max: 40 },
      { range: "41-60%", min: 41, max: 60 },
      { range: "61-80%", min: 61, max: 80 },
      { range: "81-100%", min: 81, max: 100 },
    ]

    return ranges.map(({ range, min, max }) => ({
      range,
      count: attempts.filter((attempt) => attempt.score_percentage >= min && attempt.score_percentage <= max).length,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.dailyActivity.reduce((sum, day) => sum + day.total, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quiz Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.topicPerformance.length > 0
                ? (
                    data.topicPerformance.reduce((sum, topic) => sum + Number.parseFloat(topic.avgScore), 0) /
                    data.topicPerformance.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Across all topics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Topics</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.topicPerformance.length}</div>
            <p className="text-xs text-muted-foreground">Different subjects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.monthlyTrends.length >= 2
                ? `+${(data.monthlyTrends[data.monthlyTrends.length - 1]?.activities || 0) - (data.monthlyTrends[data.monthlyTrends.length - 2]?.activities || 0)}`
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Activities this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Overview</CardTitle>
                <CardDescription>Activity breakdown for the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="mcqs" stackId="1" stroke="#15803d" fill="#15803d" />
                    <Area type="monotone" dataKey="quizzes" stackId="1" stroke="#84cc16" fill="#84cc16" />
                    <Area type="monotone" dataKey="chats" stackId="1" stroke="#059669" fill="#059669" />
                    <Area type="monotone" dataKey="pdfs" stackId="1" stroke="#10b981" fill="#10b981" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
                <CardDescription>Breakdown of different activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "MCQ Generation", value: data.dailyActivity.reduce((sum, day) => sum + day.mcqs, 0) },
                        { name: "Quiz Attempts", value: data.dailyActivity.reduce((sum, day) => sum + day.quizzes, 0) },
                        { name: "Chat Messages", value: data.dailyActivity.reduce((sum, day) => sum + day.chats, 0) },
                        { name: "PDF Generation", value: data.dailyActivity.reduce((sum, day) => sum + day.pdfs, 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Topic Performance</CardTitle>
                <CardDescription>Average scores by subject area</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topicPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="topic" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgScore" fill="#15803d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of quiz scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#84cc16" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Difficulty Analysis</CardTitle>
              <CardDescription>Performance breakdown by difficulty level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.difficultyBreakdown.map((item, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">{item.difficulty}</h3>
                    <div className="text-2xl font-bold text-primary mt-2">{item.avgScore}%</div>
                    <div className="text-sm text-muted-foreground">{item.attempts} attempts</div>
                    <Badge variant={Number.parseFloat(item.avgScore) >= 70 ? "default" : "secondary"} className="mt-2">
                      {Number.parseFloat(item.avgScore) >= 70 ? "Good" : "Needs Work"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Levels</CardTitle>
              <CardDescription>Most active users by total activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.userEngagement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="userId" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mcqs" stackId="a" fill="#15803d" name="MCQs" />
                  <Bar dataKey="quizzes" stackId="a" fill="#84cc16" name="Quizzes" />
                  <Bar dataKey="chats" stackId="a" fill="#059669" name="Chats" />
                  <Bar dataKey="pdfs" stackId="a" fill="#10b981" name="PDFs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Platform usage over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="activities" stroke="#15803d" strokeWidth={3} name="Total Activities" />
                  <Line type="monotone" dataKey="users" stroke="#84cc16" strokeWidth={3} name="Active Users" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
