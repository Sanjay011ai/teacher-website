"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Search,
  Filter,
  Eye,
  BarChart3,
  Brain,
  FileText,
  MessageSquare,
  Award,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"

interface Student {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  mcq_count: number
  pdf_count: number
  chat_count: number
  quiz_attempts: number
  avg_score: number
  last_activity: string
  activity_trend: any[]
}

interface StudentDetails {
  student: Student
  recentActivities: any[]
  topicPerformance: any[]
  scoreHistory: any[]
}

const COLORS = ["#15803d", "#84cc16", "#059669", "#10b981", "#dc2626"]

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [filterBy, setFilterBy] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null)
  const [showStudentDetails, setShowStudentDetails] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    filterAndSortStudents()
  }, [students, searchTerm, sortBy, filterBy])

  const fetchStudents = async () => {
    try {
      const [usersResult, mcqResult, pdfResult, chatResult, attemptsResult] = await Promise.all([
        supabase.from("users").select("*").eq("role", "user"),
        supabase.from("mcq_questions").select("user_id, created_at"),
        supabase.from("pdf_generations").select("user_id, created_at"),
        supabase.from("chat_messages").select("user_id, created_at"),
        supabase.from("mcq_attempts").select("user_id, score_percentage, created_at, topic"),
      ])

      const studentsWithStats = (usersResult.data || []).map((user: any) => {
        const userMcqs = mcqResult.data?.filter((mcq) => mcq.user_id === user.id) || []
        const userPdfs = pdfResult.data?.filter((pdf) => pdf.user_id === user.id) || []
        const userChats = chatResult.data?.filter((chat) => chat.user_id === user.id) || []
        const userAttempts = attemptsResult.data?.filter((attempt) => attempt.user_id === user.id) || []

        const avgScore =
          userAttempts.length > 0
            ? userAttempts.reduce((sum, attempt) => sum + attempt.score_percentage, 0) / userAttempts.length
            : 0

        const allActivities = [
          ...userMcqs.map((m) => ({ date: m.created_at, type: "mcq" })),
          ...userPdfs.map((p) => ({ date: p.created_at, type: "pdf" })),
          ...userChats.map((c) => ({ date: c.created_at, type: "chat" })),
          ...userAttempts.map((a) => ({ date: a.created_at, type: "quiz" })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        const lastActivity = allActivities.length > 0 ? allActivities[0].date : user.created_at

        // Generate activity trend for last 7 days
        const activityTrend = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split("T")[0]
          const dayActivities = allActivities.filter((activity) => activity.date.startsWith(dateStr))
          return {
            date: date.toLocaleDateString("en-US", { weekday: "short" }),
            activities: dayActivities.length,
          }
        }).reverse()

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name || "N/A",
          role: user.role,
          created_at: user.created_at,
          mcq_count: userMcqs.length,
          pdf_count: userPdfs.length,
          chat_count: userChats.length,
          quiz_attempts: userAttempts.length,
          avg_score: avgScore,
          last_activity: lastActivity,
          activity_trend: activityTrend,
        }
      })

      setStudents(studentsWithStats)
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortStudents = () => {
    const filtered = students.filter((student) => {
      const matchesSearch =
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "active" && student.quiz_attempts > 0) ||
        (filterBy === "inactive" && student.quiz_attempts === 0) ||
        (filterBy === "high-performers" && student.avg_score >= 80) ||
        (filterBy === "needs-help" && student.avg_score < 60 && student.quiz_attempts > 0)

      return matchesSearch && matchesFilter
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name)
        case "activity":
          return (
            b.mcq_count +
            b.pdf_count +
            b.chat_count +
            b.quiz_attempts -
            (a.mcq_count + a.pdf_count + a.chat_count + a.quiz_attempts)
          )
        case "score":
          return b.avg_score - a.avg_score
        case "recent":
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        default:
          return 0
      }
    })

    setFilteredStudents(filtered)
  }

  const fetchStudentDetails = async (student: Student) => {
    try {
      const [mcqResult, pdfResult, chatResult, attemptsResult] = await Promise.all([
        supabase
          .from("mcq_questions")
          .select("*")
          .eq("user_id", student.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("pdf_generations")
          .select("*")
          .eq("user_id", student.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", student.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("mcq_attempts").select("*").eq("user_id", student.id).order("created_at", { ascending: false }),
      ])

      const recentActivities = [
        ...(mcqResult.data?.map((item) => ({ ...item, type: "MCQ Generated", icon: Brain })) || []),
        ...(pdfResult.data?.map((item) => ({ ...item, type: "PDF Generated", icon: FileText })) || []),
        ...(chatResult.data?.map((item) => ({ ...item, type: "Chat Message", icon: MessageSquare })) || []),
        ...(attemptsResult.data?.map((item) => ({ ...item, type: "Quiz Completed", icon: BarChart3 })) || []),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15)

      // Process topic performance
      const topicStats = (attemptsResult.data || []).reduce((acc: any, attempt) => {
        const topic = attempt.topic || "Other"
        if (!acc[topic]) {
          acc[topic] = { attempts: 0, totalScore: 0, scores: [] }
        }
        acc[topic].attempts += 1
        acc[topic].totalScore += attempt.score_percentage
        acc[topic].scores.push(attempt.score_percentage)
        return acc
      }, {})

      const topicPerformance = Object.entries(topicStats).map(([topic, stats]: [string, any]) => ({
        topic,
        attempts: stats.attempts,
        avgScore: (stats.totalScore / stats.attempts).toFixed(1),
        bestScore: Math.max(...stats.scores),
        worstScore: Math.min(...stats.scores),
      }))

      // Score history for chart
      const scoreHistory = (attemptsResult.data || [])
        .slice(0, 10)
        .reverse()
        .map((attempt, index) => ({
          attempt: index + 1,
          score: attempt.score_percentage,
          topic: attempt.topic,
          date: new Date(attempt.created_at).toLocaleDateString(),
        }))

      setSelectedStudent({
        student,
        recentActivities,
        topicPerformance,
        scoreHistory,
      })
      setShowStudentDetails(true)
    } catch (error) {
      console.error("Error fetching student details:", error)
    }
  }

  const getPerformanceBadge = (score: number, attempts: number) => {
    if (attempts === 0) return <Badge variant="secondary">No Quizzes</Badge>
    if (score >= 90) return <Badge className="bg-green-600">Excellent</Badge>
    if (score >= 80) return <Badge className="bg-green-500">Good</Badge>
    if (score >= 70) return <Badge className="bg-yellow-500">Average</Badge>
    if (score >= 60) return <Badge className="bg-orange-500">Below Average</Badge>
    return <Badge variant="destructive">Needs Help</Badge>
  }

  const getActivityLevel = (student: Student) => {
    const totalActivity = student.mcq_count + student.pdf_count + student.chat_count + student.quiz_attempts
    if (totalActivity >= 20) return { level: "High", color: "text-green-600" }
    if (totalActivity >= 10) return { level: "Medium", color: "text-yellow-600" }
    if (totalActivity >= 5) return { level: "Low", color: "text-orange-600" }
    return { level: "Inactive", color: "text-red-600" }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{students.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{students.filter((s) => s.quiz_attempts > 0).length}</div>
            <p className="text-xs text-muted-foreground">Have taken quizzes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {students.filter((s) => s.quiz_attempts > 0).length > 0
                ? (
                    students.filter((s) => s.quiz_attempts > 0).reduce((sum, s) => sum + s.avg_score, 0) /
                    students.filter((s) => s.quiz_attempts > 0).length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average quiz score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Help</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {students.filter((s) => s.avg_score < 60 && s.quiz_attempts > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Students below 60%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
          <CardDescription>Monitor and manage student progress and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="activity">Activity Level</SelectItem>
                <SelectItem value="score">Performance</SelectItem>
                <SelectItem value="recent">Recent Activity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="high-performers">High Performers</SelectItem>
                <SelectItem value="needs-help">Needs Help</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Activity Level</TableHead>
                <TableHead>Quiz Performance</TableHead>
                <TableHead>Content Created</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const activityLevel = getActivityLevel(student)
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${activityLevel.color}`}>{activityLevel.level}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.mcq_count + student.pdf_count + student.chat_count + student.quiz_attempts} total
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getPerformanceBadge(student.avg_score, student.quiz_attempts)}
                        {student.quiz_attempts > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {student.avg_score.toFixed(1)}% avg ({student.quiz_attempts} attempts)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>MCQs: {student.mcq_count}</div>
                        <div>PDFs: {student.pdf_count}</div>
                        <div>Chats: {student.chat_count}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(student.last_activity).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="w-20 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={student.activity_trend}>
                            <Line type="monotone" dataKey="activities" stroke="#15803d" strokeWidth={2} dot={false} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background border rounded p-2 text-xs">
                                      <p>{`${label}: ${payload[0].value} activities`}</p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchStudentDetails(student)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No students found matching your criteria.</div>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Details: {selectedStudent?.student.full_name}
            </DialogTitle>
            <DialogDescription>Comprehensive overview of student performance and activity</DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Student Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{selectedStudent.student.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{selectedStudent.student.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Joined:</span>
                        <span className="font-medium">
                          {new Date(selectedStudent.student.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Activity:</span>
                        <span className="font-medium">
                          {new Date(selectedStudent.student.last_activity).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span>MCQ Questions</span>
                          </div>
                          <span className="font-bold">{selectedStudent.student.mcq_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <span>Quiz Attempts</span>
                          </div>
                          <span className="font-bold">{selectedStudent.student.quiz_attempts}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>PDF Documents</span>
                          </div>
                          <span className="font-bold">{selectedStudent.student.pdf_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <span>Chat Messages</span>
                          </div>
                          <span className="font-bold">{selectedStudent.student.chat_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Score History</CardTitle>
                      <CardDescription>Performance over recent quiz attempts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={selectedStudent.scoreHistory}>
                          <Line type="monotone" dataKey="score" stroke="#15803d" strokeWidth={2} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-background border rounded p-2 text-sm">
                                    <p className="font-medium">{data.topic}</p>
                                    <p>Score: {data.score}%</p>
                                    <p>Date: {data.date}</p>
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
                      <CardTitle>Topic Performance</CardTitle>
                      <CardDescription>Performance breakdown by subject</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedStudent.topicPerformance.map((topic, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{topic.topic}</span>
                              <span className="text-sm text-muted-foreground">{topic.attempts} attempts</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-sm">
                                Avg: {topic.avgScore}% | Best: {topic.bestScore}%
                              </div>
                              {getPerformanceBadge(Number.parseFloat(topic.avgScore), topic.attempts)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest actions and engagements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedStudent.recentActivities.map((activity, index) => {
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
                                    className={`ml-2 font-medium ${activity.score_percentage >= 70 ? "text-green-600" : "text-red-600"}`}
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
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
