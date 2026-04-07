"use client"

import { useState } from "react"
import { Search, Filter, MoreVertical, ShieldCheck, ChevronLeft, ChevronRight, Users, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface PersonnelMember {
  id: string
  name: string
  email: string
  department: string
  status: "verified" | "pending" | "expired"
  lastAccess: string
  avatar?: string
}

const statusConfig = {
  verified: { label: "Verified Access", color: "text-success bg-mint border-mint", icon: true },
  pending: { label: "Pending Review", color: "text-warning bg-peach border-peach", icon: false },
  expired: { label: "Access Expired", color: "text-danger bg-blush border-blush", icon: false },
}

interface PersonnelTableProps {
  personnel?: PersonnelMember[]
}

export function PersonnelTable({ personnel = [] }: PersonnelTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const filteredPersonnel = personnel.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.department.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="pastel-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-lavender">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Authorized Personnel</h3>
              <p className="text-sm text-muted-foreground">{personnel.length} members registered</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-muted/50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </div>

      {personnel.length === 0 ? (
        <div className="p-12 text-center">
          <div className="p-4 rounded-2xl bg-muted/30 w-fit mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-muted-foreground" />
          </div>
          <h4 className="text-foreground font-medium mb-1">No personnel added</h4>
          <p className="text-muted-foreground text-sm mb-4">Add authorized personnel to manage access</p>
          <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Personnel
          </Button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Member</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                    User ID
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                    Department
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                    Last Access
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonnel.map((person, index) => {
                  const status = statusConfig[person.status]
                  const isHovered = hoveredRow === person.id
                  return (
                    <tr
                      key={person.id}
                      className={cn(
                        "border-b border-border/50 transition-all duration-300 cursor-pointer",
                        isHovered ? "bg-lavender/20" : "hover:bg-muted/30",
                      )}
                      onMouseEnter={() => setHoveredRow(person.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={cn(
                              "w-10 h-10 transition-transform duration-300 ring-2 ring-transparent",
                              isHovered && "scale-110 ring-primary/30",
                            )}
                          >
                            <AvatarImage src={person.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-lavender text-primary font-medium">
                              {person.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p
                              className={cn(
                                "font-medium text-foreground transition-colors",
                                isHovered && "text-primary",
                              )}
                            >
                              {person.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{person.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="font-mono text-sm text-muted-foreground px-2 py-1 bg-muted/50 rounded-lg">
                          {person.id}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{person.department}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300",
                            status?.color || "bg-gray-400 text-white",

                            isHovered && "scale-105",
                          )}
                        >
                          {status.icon && <ShieldCheck className="w-3 h-3" />}
                          {status?.label || "Registered"}

                        </span>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{person.lastAccess}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing {filteredPersonnel.length} of {personnel.length} members
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="rounded-xl hover:bg-lavender/50 transition-all duration-300 bg-transparent"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl hover:bg-lavender/50 transition-all duration-300 bg-transparent"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
