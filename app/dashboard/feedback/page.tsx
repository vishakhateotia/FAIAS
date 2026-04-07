"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Send, Star, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/user-context"

const FLASK_API = "http://localhost:5001"

interface FeedbackEntry {
  feedback_id:  number
  user_id:      number
  message:      string
  submitted_at: string
  name:         string | null
  email:        string | null
}

const CATEGORIES = [
  "General Feedback",
  "Face Recognition Accuracy",
  "System Performance",
  "UI / Dashboard",
  "Alert Notifications",
  "Access Request Flow",
  "Bug Report",
  "Feature Request",
]

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]

export default function FeedbackPage() {
  const { user, isAdmin } = useUser()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [category,    setCategory]    = useState(CATEGORIES[0])
  const [rating,      setRating]      = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message,     setMessage]     = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [formError,   setFormError]   = useState("")

  // ── Admin list state ────────────────────────────────────────────────────────
  const [feedbacks,   setFeedbacks]   = useState<FeedbackEntry[]>([])
  const [fbLoading,   setFbLoading]   = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCat,   setFilterCat]   = useState("All")

  // ── Fetch all feedback (admin only) ────────────────────────────────────────
  const fetchFeedbacks = async () => {
    setFbLoading(true)
    try {
      const res  = await fetch(`${FLASK_API}/api/feedback`)
      const data = await res.json()
      setFeedbacks(data)
    } catch (e) {
      console.error("fetchFeedbacks:", e)
    } finally {
      setFbLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchFeedbacks()
  }, [isAdmin])

  // ── Submit feedback ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormError("")
    if (!message.trim())     { setFormError("Please write your feedback before submitting."); return }
    if (message.length < 10) { setFormError("Feedback must be at least 10 characters."); return }

    setSubmitting(true)
    try {
      const fullMessage = `[${category}]${rating > 0 ? ` | Rating: ${rating}/5` : ""} — ${message.trim()}`

      const res = await fetch(`${FLASK_API}/api/feedback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          message: fullMessage,
          // ✅ FIX: send the actual logged-in user's email and name
          email:   user?.email ?? "",
          name:    user?.name  ?? "",
        }),
      })

      if (!res.ok) throw new Error("Submission failed")

      setSubmitted(true)
      setMessage(""); setCategory(CATEGORIES[0]); setRating(0)
    } catch (e: any) {
      setFormError(e.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewFeedback = () => setSubmitted(false)

  // ── Filter feedbacks (admin) ────────────────────────────────────────────────
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch =
      fb.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.name  || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat =
      filterCat === "All" || fb.message.toLowerCase().includes(filterCat.toLowerCase())
    return matchesSearch && matchesCat
  })

  // ── USER VIEW ───────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Feedback
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Help us improve AURA Secure by sharing your experience.
          </p>
        </div>

        {/* Show who is submitting */}
        {user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-lg border">
            <span>Submitting as:</span>
            <span className="font-medium text-foreground">{user.name}</span>
            <span className="text-muted-foreground">({user.email})</span>
          </div>
        )}

        {submitted ? (
          <div className="border rounded-xl p-8 flex flex-col items-center gap-4 text-center bg-green-50/40">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-green-700">Feedback Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Thank you for your feedback. It has been saved and will be reviewed by an administrator.
              </p>
            </div>
            <Button variant="outline" onClick={handleNewFeedback}>
              Submit Another Feedback
            </Button>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-muted/40 border-b">
              <h3 className="font-semibold">Submit Feedback</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                All fields except rating are required.
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Rating <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star === rating ? 0 : star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={cn(
                        "w-7 h-7 transition-colors",
                        star <= (hoverRating || rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground/30"
                      )} />
                    </button>
                  ))}
                  {(hoverRating || rating) > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">
                      {RATING_LABELS[hoverRating || rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Feedback</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your experience, issue, or suggestion in detail…"
                  rows={5}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <span className={cn(
                  "text-xs mt-1 block",
                  message.length < 10 && message.length > 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {message.length < 10 && message.length > 0
                    ? `${10 - message.length} more characters needed`
                    : `${message.length} characters`}
                </span>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
                📋 Your feedback will be stored in the system database and reviewed by the administrator.
              </div>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ADMIN VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Feedback
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review feedback submitted by system users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filteredFeedbacks.length} entries</span>
          <Button variant="outline" size="sm" onClick={fetchFeedbacks} disabled={fbLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", fbLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Feedback",    value: feedbacks.length },
          { label: "This Week",         value: feedbacks.filter((f) => {
            const d = new Date(f.submitted_at)
            return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
          }).length },
          { label: "Bug Reports",       value: feedbacks.filter((f) => f.message.toLowerCase().includes("bug")).length },
          { label: "Feature Requests",  value: feedbacks.filter((f) => f.message.toLowerCase().includes("feature")).length },
        ].map((stat) => (
          <div key={stat.label} className="border rounded-xl p-4 bg-background">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by message, user or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Feedback list */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b">
          <h3 className="font-semibold">Submitted Feedback</h3>
        </div>
        <div className="divide-y">
          {fbLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-2 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No feedback found.</p>
            </div>
          ) : (
            filteredFeedbacks.map((fb) => {
              const catMatch    = fb.message.match(/^\[([^\]]+)\]/)
              const ratingMatch = fb.message.match(/Rating: (\d)\/5/)
              const cat         = catMatch    ? catMatch[1]          : "General"
              const fbRating    = ratingMatch ? parseInt(ratingMatch[1]) : null
              const cleanMsg    = fb.message.replace(/^\[[^\]]+\](\s*\|\s*Rating:\s*\d\/5\s*)?—\s*/, "")

              return (
                <div key={fb.feedback_id} className="p-4 hover:bg-muted/20 transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {(fb.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {/* ✅ FIX: show actual name and email from DB */}
                        <p className="text-sm font-medium">{fb.name || `User #${fb.user_id}`}</p>
                        <p className="text-xs text-muted-foreground">{fb.email || "—"}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
                        {cat}
                      </span>
                      {fbRating && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn(
                              "w-3 h-3",
                              i < fbRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"
                            )} />
                          ))}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {fb.submitted_at
                        ? new Date(fb.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-2 ml-10 leading-relaxed">{cleanMsg}</p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
