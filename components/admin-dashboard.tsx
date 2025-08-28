"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  MessageSquare,
  FileText,
  Brain,
  BarChart3,
  GraduationCap,
  LogOut,
  TrendingUp,
  Activity,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface AdminDashboardProps {
  user: User
}

interface DashboardStats {
  totalUsers: number
  totalMcqQuestions: number
  totalPdfGenerations: number
  totalChatMessages: number
  users: any[]
  recentActivity: any[]
  mcqByTopic: any[]
  userActivity: any[]
}

const COLORS = ["#15803d", "#84cc16", "#059669", "#10b981", "#dc2626"]

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMcqQuestions: 0,
    totalPdfGenerations: 0,
    totalChatMessages: 0,
    users: [],
    recentActivity: [],
    mcqByTopic: [],
    userActivity: [],
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all statistics
      const [usersResult, mcqResult, pdfResult, chatResult] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("mcq_questions").select("*"),
        supabase.from("pdf_generations").select("*"),
        supabase.from("chat_messages").select("*"),
      ])

      // Process MCQ data by topic
      const mcqByTopic = mcqResult.data?.reduce((acc: any, mcq: any) => {
        const topic = mcq.topic || "Other"
        acc[topic] = (acc[topic] || 0) + 1
        return acc
      }, {})

      const mcqChartData = Object.entries(mcqByTopic || {}).map(([topic, count]) => ({
        topic,
        count,
      }))

      // Process user activity data
      const userActivity = usersResult.data?.map((user: any) => {
        const userMcqs = mcqResult.data?.filter((mcq: any) => mcq.user_id === user.id).length || 0
        const userPdfs = pdfResult.data?.filter((pdf: any) => pdf.user_id === user.id).length || 0
        const userChats = chatResult.data?.filter((chat: any) => chat.user_id === user.id).length || 0

        return {
          name: user.full_name || user.email,
          mcqs: userMcqs,
          pdfs: userPdfs,
          chats: userChats,
          total: userMcqs + userPdfs + userChats,
        }
      })

      // Recent activity (last 10 items)
      const allActivity = [
        ...(mcqResult.data?.map((item: any) => ({
          type: "MCQ",
          user: item.user_id,
          topic: item.topic,
          created_at: item.created_at,
        })) || []),
        ...(pdfResult.data?.map((item: any) => ({
          type: "PDF",
          user: item.user_id,
          topic: item.topic,
          created_at: item.created_at,
        })) || []),
        ...(chatResult.data?.map((item: any) => ({
          type: "Chat",
          user: item.user_id,
          message: item.message.substring(0, 50) + "...",
          created_at: item.created_at,
        })) || []),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      setStats({
        totalUsers: usersResult.data?.length || 0,
        totalMcqQuestions: mcqResult.data?.length || 0,
        totalPdfGenerations: pdfResult.data?.length || 0,
        totalChatMessages: chatResult.data?.length || 0,
        users: usersResult.data || [],
        recentActivity: allActivity,
        mcqByTopic: mcqChartData,
        userActivity: userActivity || [],
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
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
                <h1 className="text-2xl font-bold text-primary">Teacher AI Admin</h1>
                <p className="text-sm text-muted-foreground">Welcome back, Administrator</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MCQ Questions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalMcqQuestions}</div>
              <p className="text-xs text-muted-foreground">Generated questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDF Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalPdfGenerations}</div>
              <p className="text-xs text-muted-foreground">Generated documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalChatMessages}</div>
              <p className="text-xs text-muted-foreground">AI conversations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* MCQ Topics Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    MCQ Questions by Topic
                  </CardTitle>
                  <CardDescription>Distribution of generated MCQ questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.mcqByTopic}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ topic, percent }) => `${topic} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {stats.mcqByTopic.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    User Activity Overview
                  </CardTitle>
                  <CardDescription>Activity breakdown by user</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.userActivity.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="mcqs" fill="#15803d" name="MCQs" />
                      <Bar dataKey="pdfs" fill="#84cc16" name="PDFs" />
                      <Bar dataKey="chats" fill="#059669" name="Chats" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>All registered users and their information</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.users.map((user) => {
                      const userStats = stats.userActivity.find((u) => u.name === (user.full_name || user.email))
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>MCQs: {userStats?.mcqs || 0}</div>
                              <div>PDFs: {userStats?.pdfs || 0}</div>
                              <div>Chats: {userStats?.chats || 0}</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Usage Statistics</CardTitle>
                  <CardDescription>Overall platform engagement metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average MCQs per User</span>
                    <span className="font-bold">
                      {stats.totalUsers > 0 ? (stats.totalMcqQuestions / stats.totalUsers).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average PDFs per User</span>
                    <span className="font-bold">
                      {stats.totalUsers > 0 ? (stats.totalPdfGenerations / stats.totalUsers).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Chats per User</span>
                    <span className="font-bold">
                      {stats.totalUsers > 0 ? (stats.totalChatMessages / stats.totalUsers).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Most Active User</span>
                    <span className="font-bold">
                      {stats.userActivity.length > 0 ? stats.userActivity[0]?.name : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Distribution</CardTitle>
                  <CardDescription>Breakdown of generated content</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "MCQ Questions", value: stats.totalMcqQuestions },
                          { name: "PDF Documents", value: stats.totalPdfGenerations },
                          { name: "Chat Messages", value: stats.totalChatMessages },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#15803d" />
                        <Cell fill="#84cc16" />
                        <Cell fill="#059669" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest user actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {activity.type === "MCQ" && <Brain className="h-4 w-4 text-primary" />}
                        {activity.type === "PDF" && <FileText className="h-4 w-4 text-primary" />}
                        {activity.type === "Chat" && <MessageSquare className="h-4 w-4 text-primary" />}
                        <div>
                          <p className="font-medium">
                            {activity.type} {activity.type === "Chat" ? "Message" : "Generated"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.topic || activity.message || "No details"}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
