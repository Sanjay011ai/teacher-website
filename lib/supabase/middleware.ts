import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const isV0Environment = () => {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.VERCEL_URL?.includes("vusercontent.net") || process.env.VERCEL_URL?.includes("preview-"))
  )
}

const protectedRoutes = {
  "/dashboard": ["user", "teacher", "admin"],
  "/mcq-generator": ["user", "teacher", "admin"],
  "/pdf-generator": ["user", "teacher", "admin"],
  "/chat": ["user", "teacher", "admin"],
  "/admin": ["admin"],
  "/teacher": ["teacher", "admin"],
}

const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/auth/callback",
]

const isProtectedRoute = (pathname: string): boolean => {
  return Object.keys(protectedRoutes).some((route) => pathname.startsWith(route))
}

const hasRequiredRole = (pathname: string, userRole: string): boolean => {
  const matchedRoute = Object.keys(protectedRoutes).find((route) => pathname.startsWith(route))
  if (!matchedRoute) return true

  const requiredRoles = protectedRoutes[matchedRoute as keyof typeof protectedRoutes]
  return requiredRoles.includes(userRole)
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next({ request })
  }

  if (isV0Environment()) {
    const mockUserCookie = request.cookies.get("mock-auth-user")
    const user = mockUserCookie ? JSON.parse(mockUserCookie.value) : null

    if (isProtectedRoute(pathname)) {
      if (!user) {
        console.log("[v0] Redirecting unauthenticated user to login:", pathname)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirectTo", pathname)
        return NextResponse.redirect(url)
      }

      if (!hasRequiredRole(pathname, user.role)) {
        console.log("[v0] Access denied for role:", user.role, "to route:", pathname)
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
    }

    const response = NextResponse.next({ request })
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

    return response
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (isProtectedRoute(pathname)) {
      if (!user) {
        console.log("[v0] Redirecting unauthenticated user to login:", pathname)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirectTo", pathname)
        return NextResponse.redirect(url)
      }

      try {
        const { data: userProfile } = await supabase.from("users").select("role").eq("id", user.id).single()

        const userRole = userProfile?.role || "user"

        if (!hasRequiredRole(pathname, userRole)) {
          console.log("[v0] Access denied for role:", userRole, "to route:", pathname)
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }
      } catch (roleError) {
        console.error("[v0] Error fetching user role:", roleError)
        // Default to user role if we can't fetch it
        if (!hasRequiredRole(pathname, "user")) {
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }
      }
    }

    supabaseResponse.headers.set("X-Frame-Options", "DENY")
    supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
    supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block")

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware authentication failed:", error)

    if (isProtectedRoute(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      url.searchParams.set("error", "auth_error")
      return NextResponse.redirect(url)
    }

    // Allow access to public routes even if Supabase is unavailable
    return NextResponse.next({ request })
  }
}
