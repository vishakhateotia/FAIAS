"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { Sidebar } from "@/components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const [role, setRole] = useState("user")

  useEffect(() => {
    const r = localStorage.getItem("role")
    if (r) setRole(r)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} />
      <main className="lg:pl-64 pl-20 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
