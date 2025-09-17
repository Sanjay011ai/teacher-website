"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Shield } from "lucide-react"

interface RouteGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  fallbackPath?: string
}

export function RouteGuard({ children, requiredRoles = ["user"], fallbackPath = "/dashboard" }: RouteGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    checkAuthorization()
  }, [pathname])

  const checkAuthorization = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsAuthorized(false)
        router.push(`/auth/login?redirectTo=${pathname}`)
        return
      }

      // Get user role from database
      const { data: userProfile } = await supabase.from("users").select("role").eq("id", user.id).single()

      const role = userProfile?.role || "user"
      setUserRole(role)

      // Check if user has required role
      const hasAccess = requiredRoles.includes(role)
      setIsAuthorized(hasAccess)

      if (!hasAccess) {
        router.push(fallbackPath)
      }
    } catch (error) {
      console.error("Authorization check failed:", error)
      setIsAuthorized(false)
      router.push("/auth/login")
    }
  }

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verifying access...</p>
        </div>
      </div>
    )
  }

  // Unauthorized state
  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You don't have permission to access this page.
                  {userRole && (
                    <span className="block mt-1">
                      Your role: <span className="font-medium">{userRole}</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex justify-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authorized - render children
  return <>{children}</>
}
