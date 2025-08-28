import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin-dashboard"
import { UserDashboard } from "@/components/user-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to check role
  const { data: userProfile } = await supabase.from("users").select("role").eq("id", data.user.id).single()

  const isAdmin = userProfile?.role === "admin"

  return (
    <div className="min-h-screen bg-background">
      {isAdmin ? <AdminDashboard user={data.user} /> : <UserDashboard user={data.user} />}
    </div>
  )
}
