"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "./logo"
import { cn } from "@/lib/utils"
import { useUser, type UserRole } from "@/lib/user-context"

type LoginType = "user" | "admin"

export function LoginForm() {
  const router   = useRouter()
  const { setUser } = useUser()

  const [loginType,    setLoginType]    = useState<LoginType>("admin")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [isSignup,     setIsSignup]     = useState(false)
  const [otpSent,      setOtpSent]      = useState(false)
  const [otpLoading,   setOtpLoading]   = useState(false)

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [otp,      setOtp]      = useState("")
  const [error,    setError]    = useState("")

  // ── Switch tabs — reset form state ──────────────────────────────────────────
  const handleTabSwitch = (type: LoginType) => {
    setLoginType(type)
    setIsSignup(false)
    setOtpSent(false)
    setEmail("")
    setPassword("")
    setOtp("")
    setError("")
  }

  // ── Send OTP ─────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError("")
    if (!email) { setError("Please enter your email first."); return }

    setOtpLoading(true)
    try {
      const res  = await fetch("http://localhost:8000/api/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || "Failed to send OTP.")
        return
      }

      setOtpSent(true)
      setError("")
    } catch {
      setError("Could not reach server. Is main.py running?")
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Submit (login or signup) ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // ── SIGNUP ────────────────────────────────────────────────────────────────
      if (isSignup) {
        if (!otp) { setError("Please enter the OTP sent to your email."); return }

        const res  = await fetch("http://localhost:8000/api/signup", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email, password, otp }),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.detail || "Signup failed.")
          return
        }

        setError("")
        setIsSignup(false)
        setOtpSent(false)
        setOtp("")
        setError("✅ Account created! Please sign in.")
        return
      }

      // ── LOGIN ─────────────────────────────────────────────────────────────────
      const res  = await fetch("http://localhost:8000/api/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok || data.status !== "login success") {
        setError(data.message || "Invalid email or password.")
        return
      }

      const returnedRole: string = data.role   // "admin" or "user"

      // ── Guard: Admin tab must log in as admin ─────────────────────────────────
      if (loginType === "admin" && returnedRole !== "admin") {
        setError("These credentials don't have admin access. Use the User Login tab.")
        return
      }

      // ── Guard: User tab must log in as user ───────────────────────────────────
      if (loginType === "user" && returnedRole !== "user") {
        setError("Admins must use the Admin Login tab.")
        return
      }

      // ── Save user context ─────────────────────────────────────────────────────
      setUser({
        email: email,
        role:  returnedRole as UserRole,
        name:  data.name ?? email.split("@")[0],
      })

      localStorage.setItem("role",  returnedRole)
      localStorage.setItem("email", email)

      // ── Route based on role ───────────────────────────────────────────────────
      if (returnedRole === "admin") {
        router.push("/dashboard")          // admin dashboard (full access)
      } else {
        router.push("/dashboard")          // user dashboard (restricted sidebar)
      }
      // Both go to /dashboard but the sidebar/pages use isAdmin from context
      // to show/hide admin-only items — so routing the same path is correct.

    } catch {
      setError("Could not reach server. Is main.py running on port 8000?")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-lavender/30 via-background to-mint/20">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl p-8 space-y-6 shadow-lg">

          {/* Header */}
          <div className="text-center space-y-3">
            <Logo size="lg" />
            <h1 className="text-2xl font-semibold">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to access the security control center
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["user", "admin"] as LoginType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTabSwitch(type)}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  loginType === type
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === "user" ? "User Login" : "Admin Login"}
              </button>
            ))}
          </div>

          {/* Sign up toggle — only on user tab */}
          {loginType === "user" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup)
                  setOtpSent(false)
                  setOtp("")
                  setError("")
                }}
                className="text-sm text-primary hover:underline"
              >
                {isSignup ? "Already have an account? Sign In" : "New user? Sign Up"}
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder={loginType === "admin" ? "admin@gmail.com" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={loginType === "admin" ? "admin123" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* OTP section — signup only */}
            {isSignup && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>OTP</Label>
                    <Input
                      type="text"
                      placeholder={otpSent ? "Enter OTP from email" : "Click Send OTP first"}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={!otpSent}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={otpLoading || !email}
                      onClick={handleSendOtp}
                      className="whitespace-nowrap"
                    >
                      {otpLoading ? "Sending…" : otpSent ? "Resend OTP" : "Send OTP"}
                    </Button>
                  </div>
                </div>
                {otpSent && (
                  <p className="text-xs text-green-600">
                    ✅ OTP sent to {email} — check your inbox (expires in 5 min)
                  </p>
                )}
              </>
            )}

            {/* Error / success message */}
            {error && (
              <p className={cn(
                "text-sm px-3 py-2 rounded-md",
                error.startsWith("✅")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              )}>
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? (isSignup ? "Creating account…" : "Signing in…")
                : (isSignup ? "Create Account" : "Sign In")}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Protected by AuraSecure Facial Authentication System
          </p>
        </div>
      </div>
    </div>
  )
}
