import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const isV0Environment = () => {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.VERCEL_URL?.includes("vusercontent.net") || process.env.VERCEL_URL?.includes("preview-"))
  )
}

export async function updateSession(request: NextRequest) {
  if (isV0Environment()) {
    const mockUserCookie = request.cookies.get("mock-auth-user")
    const user = mockUserCookie ? JSON.parse(mockUserCookie.value) : null

    if (
      request.nextUrl.pathname !== "/" &&
      !user &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth")
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

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
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (
      request.nextUrl.pathname !== "/" &&
      !user &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth")
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware authentication failed:", error)
    // Allow access to continue if Supabase is unavailable
    return NextResponse.next({
      request,
    })
  }
}
