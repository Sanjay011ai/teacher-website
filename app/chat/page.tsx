"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  GraduationCap,
  MessageSquare,
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  Lightbulb,
  BookOpen,
  Calculator,
  Globe,
} from "lucide-react"
import Link from "next/link"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { RouteGuard } from "@/components/route-guard"

interface ChatMessage {
  id?: string
  message: string
  response: string
  user_id?: string
  created_at?: string
}

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  {
    icon: BookOpen,
    text: "Explain photosynthesis in simple terms",
    category: "Science",
  },
  {
    icon: Calculator,
    text: "Help me understand quadratic equations",
    category: "Math",
  },
  {
    icon: Globe,
    text: "Tell me about the Renaissance period",
    category: "History",
  },
  {
    icon: Lightbulb,
    text: "Create a lesson plan for teaching fractions",
    category: "Teaching",
  },
]

export default function ChatPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchChatHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    setUser(user)
    setLoading(false)
  }

  const fetchChatHistory = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (!error && data) {
      setChatHistory(data)

      // Convert to message format for display
      const formattedMessages: Message[] = []
      data.reverse().forEach((chat) => {
        formattedMessages.push({
          id: `${chat.id}-user`,
          content: chat.message,
          role: "user",
          timestamp: new Date(chat.created_at),
        })
        formattedMessages.push({
          id: `${chat.id}-assistant`,
          content: chat.response,
          role: "assistant",
          timestamp: new Date(chat.created_at),
        })
      })
      setMessages(formattedMessages)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (messageText?: string) => {
    const message = messageText || inputMessage.trim()
    if (!message) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: message,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Refresh chat history
      await fetchChatHistory()
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requiredRoles={["user", "teacher", "admin"]}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">AI Chat Assistant</h1>
                  <p className="text-sm text-muted-foreground">Interactive educational support</p>
                </div>
              </div>
              <Button onClick={clearChat} variant="outline" size="sm">
                Clear Chat
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 container mx-auto px-6 py-6 flex gap-6">
          {/* Suggestions Sidebar */}
          <div className="w-80 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Suggested Questions</CardTitle>
                <CardDescription>Click on any suggestion to get started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => sendMessage(prompt.text)}
                  >
                    <div className="flex items-start gap-3">
                      <prompt.icon className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{prompt.text}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {prompt.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chat Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Ask specific questions for better answers</p>
                <p>• Request explanations at different levels</p>
                <p>• Ask for examples and practice problems</p>
                <p>• Get help with lesson planning</p>
                <p>• Explore any educational topic</p>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <CardTitle>Chat with AI Teacher</CardTitle>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Bot className="h-3 w-3" />
                    Online
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 py-4">
                    {messages.length === 0 && (
                      <div className="text-center py-12">
                        <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Welcome to AI Teacher Chat!</h3>
                        <p className="text-muted-foreground">
                          Ask me anything about education, get explanations, or request help with teaching materials.
                        </p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}

                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-3 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                        </div>

                        {message.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about education..."
                      disabled={isTyping}
                      className="flex-1"
                    />
                    <Button onClick={() => sendMessage()} disabled={!inputMessage.trim() || isTyping} size="icon">
                      {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
