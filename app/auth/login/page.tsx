import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { GraduationCap, Info } from "lucide-react"
import { loginAction } from "../actions"

const isV0Environment = () => {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.VERCEL_URL?.includes("vusercontent.net") || process.env.VERCEL_URL?.includes("preview-"))
  )
}

export default function LoginPage() {
  const showMockCredentials = isV0Environment()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">Teacher AI</h1>
            </div>
            <p className="text-muted-foreground">Empowering education with artificial intelligence</p>
          </div>

          {showMockCredentials && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Demo Credentials Available:</p>
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Admin:</strong> admin@teacher.ai / admin123
                      </p>
                      <p>
                        <strong>Teacher:</strong> teacher@school.edu / teacher123
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center">Sign in to your Teacher AI account</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={loginAction}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      defaultValue={showMockCredentials ? "admin@teacher.ai" : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      defaultValue={showMockCredentials ? "admin123" : ""}
                    />
                  </div>

                  {showMockCredentials && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Admin credentials are pre-filled for demo</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full">
                    Sign In
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
                    Create account
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
