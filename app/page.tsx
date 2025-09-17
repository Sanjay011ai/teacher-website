import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { GraduationCap, Brain, FileText, MessageSquare, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <GraduationCap className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Teacher AI</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Revolutionize your teaching experience with AI-powered tools for creating MCQ questions, generating
            educational content, and interactive learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/auth/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-transparent">
              <Link href="/auth/sign-up">Create Account</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">MCQ Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Create intelligent multiple-choice questions on any topic using AI</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">PDF Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate comprehensive educational materials with images and detailed content
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">AI Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Interactive AI assistant for educational queries and teaching support</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Track usage, monitor student progress, and analyze learning patterns</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Admin Access Note */}
        <div className="text-center">
          <Card className="max-w-md mx-auto bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Admin Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">For administrators, use the quick admin login with:</p>
              <div className="text-sm font-mono bg-background p-2 rounded border">
                <div>Email: admin@teachai.com</div>
                <div>Password: 123</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
