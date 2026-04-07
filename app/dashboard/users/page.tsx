"use client"

import { useEffect, useState } from "react"
import { PersonnelTable } from "@/components/personnel-table"
import { Button } from "@/components/ui/button"
import { UserPlus, Sparkles } from "lucide-react"

export default function UsersPage() {
  const [personnel, setPersonnel] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5001/api/users")

      if (!res.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await res.json()

      // ✅ CORRECT MAPPING FOR PersonnelTable
      const mappedData = data.map((user: any) => ({
        id: user.user_id.toString(),
        name: user.name,
        email: user.email,
        department: user.role || "General",
        status: "verified",          // MUST be string
        lastAccess: user.created_at,
        avatar: undefined,
      }))

      setPersonnel(mappedData)
    } catch (err) {
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }

  const addUser = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Name and email required")
      return
    }

    try {
      const res = await fetch("http://localhost:5001/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to add user")
      }

      setName("")
      setEmail("")
      fetchUsers()
    } catch (err) {
      console.error("Error adding user:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            Users
            <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system users
          </p>
        </div>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <PersonnelTable personnel={personnel} />
      )}
    </div>
  )
}
