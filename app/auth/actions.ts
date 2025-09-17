"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

const isV0Environment = () => {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.VERCEL_URL?.includes("vusercontent.net") || process.env.VERCEL_URL?.includes("preview-"))
  )
}

// Mock user data for testing
const mockUsers = [
  {
    id: "1",
    email: "admin@teacher.ai",
    password: "admin123",
    role: "admin",
    name: "Admin User",
  },
  {
    id: "2",
    email: "teacher@school.edu",
    password: "teacher123",
    role: "teacher",
    name: "Teacher User",
  },
]

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  if (isV0Environment()) {
    console.log("[v0] Using mock authentication for v0 environment")

    // Find mock user
    const mockUser = mockUsers.find((u) => u.email === email && u.password === password)

    if (!mockUser) {
      return { error: "Invalid email or password" }
    }

    // Set mock session cookie
    const cookieStore = await cookies()
    cookieStore.set(
      "mock-auth-user",
      JSON.stringify({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: mockUser.name,
      }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    )

    console.log("[v0] Mock authentication successful for:", mockUser.email)
    redirect("/dashboard")
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    redirect("/dashboard")
  } catch (error) {
    console.error("[v0] Supabase authentication failed:", error)
    return { error: "Authentication service unavailable. Please try again later." }
  }
}

export async function logoutAction() {
  if (isV0Environment()) {
    const cookieStore = await cookies()
    cookieStore.delete("mock-auth-user")
    redirect("/auth/login")
  }

  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  } catch (error) {
    console.error("[v0] Logout failed:", error)
    redirect("/auth/login")
  }
}

export async function getCurrentUser() {
  if (isV0Environment()) {
    const cookieStore = await cookies()
    const mockUserCookie = cookieStore.get("mock-auth-user")

    if (mockUserCookie) {
      try {
        return JSON.parse(mockUserCookie.value)
      } catch {
        return null
      }
    }
    return null
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error("[v0] Get user failed:", error)
    return null
  }
}
