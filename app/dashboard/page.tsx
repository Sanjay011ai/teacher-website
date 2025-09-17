import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/app/auth/actions"
import { AdminDashboard } from "@/components/admin-dashboard"
import { UserDashboard } from "@/components/user-dashboard"

const isV0Environment = () => {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.VERCEL_URL?.includes("vusercontent.net") || process.env.VERCEL_URL?.includes("preview-"))
  )
}

export default async function DashboardPage() {
  if (isV0Environment()) {
    const mockUser = await getCurrentUser()

    if (!mockUser) {
      redirect("/auth/login")
    }

    const isAdminOrTeacher = mockUser.role === "admin" || mockUser.role === "teacher"

    return (
      <div className="min-h-screen bg-background">
        {isAdminOrTeacher ? <AdminDashboard user={mockUser} /> : <UserDashboard user={mockUser} />}
      </div>
    )
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      redirect("/auth/login")
    }

    // Get user profile to check role
    const { data: userProfile } = await supabase.from("users").select("role").eq("id", data.user.id).single()

    const isAdminOrTeacher = userProfile?.role === "admin" || userProfile?.role === "teacher"

    return (
      <div className="min-h-screen bg-background">
        {isAdminOrTeacher ? <AdminDashboard user={data.user} /> : <UserDashboard user={data.user} />}
      </div>
    )
  } catch (error) {
    console.error("[v0] Dashboard authentication failed:", error)
    redirect("/auth/login")
  }
}
