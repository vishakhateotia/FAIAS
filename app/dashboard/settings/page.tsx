"use client"

import { useState, useEffect, useRef } from "react"
import {
  Shield, Bell, Camera, Database, Users, Lock, UserPlus,
  Pencil, Trash2, X, Check, Eye, Save, RotateCcw, HardDrive, Key,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/user-context"

const MAIN_API  = "http://localhost:8000"
const FLASK_API = "http://localhost:5001"

const adminSections = [
  { id: "general",       label: "General",         icon: Shield,   adminOnly: false },
  { id: "notifications", label: "Notifications",   icon: Bell,     adminOnly: false },
  { id: "storage",       label: "Storage",         icon: Database, adminOnly: true  },
  { id: "users",         label: "User Management", icon: Users,    adminOnly: true  },
  { id: "security",      label: "Security",        icon: Lock,     adminOnly: true  },
]

interface AuthUser {
  person_id: number; name: string; unique_id: string
  image_path: string; image: string; added_by: string; date_added: string
  contact?: string; address?: string; email?: string
}
interface AccessRequest {
  id: number; name: string; image: string; created_at: string
}

// ─── Shared small components ──────────────────────────────────────────────────
function Avatar({ src, name }: { src?: string; name: string }) {
  return src ? (
    <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function FilePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <button type="button" onClick={() => ref.current?.click()}
        className="w-full border border-dashed border-border rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition text-left">
        {file ? `📎 ${file.name}` : "Click to choose photo…"}
      </button>
    </>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-foreground group-hover:text-primary transition">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={cn("relative w-11 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0")} />
      </button>
    </label>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-muted/40 border-b"><h3 className="font-semibold">{title}</h3></div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function SaveBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button onClick={onClick} disabled={loading} className="mt-1">
      <Save className="w-4 h-4 mr-2" />{loading ? "Saving…" : "Save Changes"}
    </Button>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function ViewModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">User Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col items-center gap-3 py-2">
          {user.image
            ? <img src={user.image} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary/20" />
            : <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">{user.name.charAt(0)}</div>}
          <div className="text-center">
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-sm text-muted-foreground">ID: {user.unique_id}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ["Added by",   user.added_by             || "—"],
            ["Date added", user.date_added?.slice(0, 10) || "—"],
            ["Email",      user.email                || "—"],
            ["Contact",    user.contact              || "—"],
            ["Address",    user.address              || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium capitalize text-right max-w-[60%]">{v}</span>
            </div>
          ))}
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Status</span>
            <span className="text-green-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Authorized</span>
          </div>
        </div>
        <Button className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

function EditModal({ user, onClose, onSaved }: { user: AuthUser; onClose: () => void; onSaved: () => void }) {
  const [name,    setName]    = useState(user.name)
  const [email,   setEmail]   = useState(user.email   || "")
  const [contact, setContact] = useState(user.contact || "")
  const [address, setAddress] = useState(user.address || "")
  const [file,    setFile]    = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState("")

  const handleSave = async () => {
    if (!name.trim()) { setError("Name cannot be empty"); return }
    setSaving(true); setError("")
    const fd = new FormData()
    fd.append("name",    name.trim())
    fd.append("email",   email.trim())
    fd.append("contact", contact.trim())
    fd.append("address", address.trim())
    if (file) fd.append("image", file)
    try {
      const res = await fetch(`${MAIN_API}/api/authorized/${user.person_id}`, { method: "PUT", body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to update") }
      onSaved(); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Edit User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-3">
          <Avatar src={user.image} name={user.name} />
          <span className="text-sm text-muted-foreground">ID: {user.unique_id}</span>
        </div>
        <div className="space-y-3">
          <FieldRow label="Full Name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </FieldRow>
          <FieldRow label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
          </FieldRow>
          <FieldRow label="Contact Number">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </FieldRow>
          <FieldRow label="Address">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address…"
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </FieldRow>
          <FieldRow label="Replace Photo (optional)">
            <FilePicker file={file} onChange={setFile} />
          </FieldRow>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>
    </div>
  )
}

function DeleteDialog({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-lg">Delete User</h3>
        <p className="text-sm text-muted-foreground">Permanently removes the user and their face data. They will no longer be recognized by the live feed.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>{loading ? "Deleting…" : "Delete"}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Section: General ─────────────────────────────────────────────────────────
function GeneralSection({ isAdmin }: { isAdmin: boolean }) {
  const [orgName,  setOrgName]  = useState("AURA Secure")
  const [siteId,   setSiteId]   = useState("SITE-001")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [saved,    setSaved]    = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <SectionCard title="Organization Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Organization Name"><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></FieldRow>
            <FieldRow label="Site ID"><Input value={siteId} onChange={(e) => setSiteId(e.target.value)} /></FieldRow>
          </div>
          <FieldRow label="Timezone">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </FieldRow>
          {saved && <p className="text-green-600 text-sm">✅ Settings saved.</p>}
          <SaveBtn onClick={save} />
        </SectionCard>
      )}
      <SectionCard title="System Status">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Face Engine",  color: "bg-green-500",  status: "Online"  },
            { label: "Database",     color: "bg-green-500",  status: "Online"  },
            { label: "Email Alerts", color: "bg-green-500",  status: "Active"  },
            { label: "Camera Feed",  color: "bg-yellow-400", status: "Standby" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 p-3 border rounded-lg bg-muted/20">
              <span className={cn("w-3 h-3 rounded-full", item.color)} />
              <span className="text-xs text-muted-foreground text-center">{item.label}</span>
              <span className="text-xs font-medium">{item.status}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="About">
        <div className="space-y-2 text-sm">
          {[
            ["System",   "AURA Secure — Face AI Access System"],
            ["Frontend", "Next.js 14 + Tailwind CSS"],
            ["main.py",  "FastAPI — port 8000 (face engine)"],
            ["app.py",   "Flask — port 5001 (analytics / alerts)"],
            ["Database", "SQLite — faias.db"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Section: Notifications ───────────────────────────────────────────────────
function NotificationsSection({ isAdmin }: { isAdmin: boolean }) {
  const [emailAlerts,   setEmailAlerts]   = useState(true)
  const [intruderAlert, setIntruderAlert] = useState(true)
  const [accessAlert,   setAccessAlert]   = useState(false)
  const [soundAlerts,   setSoundAlerts]   = useState(true)
  const [cooldown,      setCooldown]      = useState("60")
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div className="space-y-6">
      <SectionCard title="Alert Channels">
        <Toggle checked={emailAlerts} onChange={setEmailAlerts} label="Email alerts on intrusion detection" />
        <Toggle checked={soundAlerts} onChange={setSoundAlerts} label="Sound alert in browser" />
      </SectionCard>
      <SectionCard title="Alert Types">
        <Toggle checked={intruderAlert} onChange={setIntruderAlert} label="Unauthorized / intruder detected" />
        <Toggle checked={accessAlert}   onChange={setAccessAlert}   label="Authorized access granted" />
      </SectionCard>
      {isAdmin && (
        <SectionCard title="Email Configuration">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Sender Email"><Input defaultValue="aurasecure01@gmail.com" type="email" /></FieldRow>
            <FieldRow label="Alert Receiver"><Input defaultValue="User's Mail" type="email" /></FieldRow>
          </div>
          <FieldRow label="Alert Cooldown (seconds)">
            <Input value={cooldown} onChange={(e) => setCooldown(e.target.value)} type="number" className="w-40" />
            <p className="text-xs text-muted-foreground mt-1">Minimum gap between repeated email alerts.</p>
          </FieldRow>
          {saved && <p className="text-green-600 text-sm">✅ Saved.</p>}
          <SaveBtn onClick={save} />
        </SectionCard>
      )}
    </div>
  )
}

// ─── Section: Storage ─────────────────────────────────────────────────────────
function StorageSection() {
  const [retentionDays,  setRetentionDays]  = useState("30")
  const [autoDelete,     setAutoDelete]     = useState(true)
  const [compressImages, setCompressImages] = useState(false)
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div className="space-y-6">
      <SectionCard title="Storage Usage">
        <div className="space-y-2">
          {[
            { label: "Face Images (authorized)", used: "12 MB",  path: "/faces"    },
            { label: "Intruder Snapshots",       used: "45 MB",  path: "/intruders"},
            { label: "Database (faias.db)",      used: "1.2 MB", path: "/faias.db" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
              <div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground font-mono">{item.path}</p></div>
              <span className="text-muted-foreground font-mono text-xs">{item.used}</span>
            </div>
          ))}
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Total used</span><span className="font-semibold">~58 MB</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: "12%" }} /></div>
          <p className="text-xs text-muted-foreground mt-1">12% of estimated 500 MB</p>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Section: Security ────────────────────────────────────────────────────────
function SecuritySection() {
  const [sessionTimeout, setSessionTimeout] = useState("30")
  const [loginLogs,      setLoginLogs]      = useState(true)
  const [strictMode,     setStrictMode]     = useState(false)
  const [currentPass,    setCurrentPass]    = useState("")
  const [newPass,        setNewPass]        = useState("")
  const [confirmPass,    setConfirmPass]    = useState("")
  const [passMsg,        setPassMsg]        = useState("")
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const handleChangePass = () => {
    if (!currentPass || !newPass || !confirmPass) { setPassMsg("All fields are required."); return }
    if (newPass !== confirmPass) { setPassMsg("Passwords do not match."); return }
    if (newPass.length < 8)      { setPassMsg("Minimum 8 characters."); return }
    setPassMsg("✅ Password updated.")
    setCurrentPass(""); setNewPass(""); setConfirmPass("")
  }

  const loginHistory = [
    { time: "2026-03-26 16:51:55", ip: "127.0.0.1",  status: "Success", role: "admin" },
    { time: "2026-03-26 09:58:41", ip: "127.0.0.1",  status: "Success", role: "user"  },
    { time: "2026-03-25 14:22:10", ip: "192.168.1.4", status: "Failed",  role: "—"    },
  ]

  return (
    <div className="space-y-6">
      <SectionCard title="Access Policies">
        <Toggle checked={loginLogs}  onChange={setLoginLogs}  label="Log all login attempts" />
        <Toggle checked={strictMode} onChange={setStrictMode} label="Strict face match mode (tolerance 0.40)" />
        <FieldRow label="Session Timeout (minutes)">
          <Input value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} type="number" className="w-36" />
        </FieldRow>
        {saved && <p className="text-green-600 text-sm">✅ Saved.</p>}
        <SaveBtn onClick={save} />
      </SectionCard>
      <SectionCard title="Change Password">
        <div className="space-y-3 max-w-sm">
          <FieldRow label="Current Password"><Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} /></FieldRow>
          <FieldRow label="New Password"><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></FieldRow>
          <FieldRow label="Confirm New Password"><Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} /></FieldRow>
          {passMsg && <p className={cn("text-sm", passMsg.startsWith("✅") ? "text-green-600" : "text-red-500")}>{passMsg}</p>}
          <Button onClick={handleChangePass}><Key className="w-4 h-4 mr-2" />Update Password</Button>
        </div>
      </SectionCard>
      <SectionCard title="Login History">
        <div className="space-y-2">
          {loginHistory.map((log, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
              <div>
                <p className="font-medium font-mono text-xs">{log.time}</p>
                <p className="text-muted-foreground text-xs">IP: {log.ip} · Role: {log.role}</p>
              </div>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                log.status === "Success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Section: Users (admin) ───────────────────────────────────────────────────
function UsersSection({
  authUsers, authLoading, requests, reqsLoading,
  adminName, setAdminName, adminEmail, setAdminEmail,
  adminContact, setAdminContact, adminAddress, setAdminAddress,
  adminFile, setAdminFile,
  addLoading, addError, addSuccess,
  onAddUser, onApprove, onReject, onViewUser, onEditUser, onSetDeleteId,
}: any) {
  return (
    <div className="space-y-6">

      {/* Pending Requests */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b flex items-center gap-2">
          <h3 className="font-semibold">Pending Requests</h3>
          {requests.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
          )}
        </div>
        <div className="p-4">
          {reqsLoading
            ? <p className="text-sm text-muted-foreground">Loading…</p>
            : requests.length === 0
            ? <p className="text-sm text-muted-foreground">No pending requests</p>
            : (
              <div className="space-y-3">
                {requests.map((req: AccessRequest) => (
                  <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex items-center gap-3">
                      <Avatar src={req.image} name={req.name} />
                      <div>
                        <p className="font-medium text-sm">{req.name}</p>
                        <p className="text-xs text-muted-foreground">{req.created_at?.slice(0, 10) || ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(req.id)}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onReject(req.id)}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Authorized Users */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b">
          <h3 className="font-semibold">
            Authorized Users{" "}
            <span className="text-sm text-muted-foreground font-normal">({authUsers.length} registered)</span>
          </h3>
        </div>
        <div className="p-4">
          {authLoading
            ? <p className="text-sm text-muted-foreground">Loading…</p>
            : authUsers.length === 0
            ? <p className="text-sm text-muted-foreground">No authorized users yet.</p>
            : (
              <div className="space-y-2">
                {authUsers.map((u: AuthUser) => (
                  <div key={u.person_id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-background hover:bg-muted/30 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.image} name={u.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.unique_id}</p>
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button title="View"   onClick={() => onViewUser(u)}              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"><Eye    className="w-4 h-4" /></button>
                      <button title="Edit"   onClick={() => onEditUser(u)}              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"><Pencil className="w-4 h-4" /></button>
                      <button title="Delete" onClick={() => onSetDeleteId(u.person_id)} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Add New User */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b"><h3 className="font-semibold">Add New User</h3></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Full Name *">
              <Input placeholder="Full name" value={adminName} onChange={(e: any) => setAdminName(e.target.value)} />
            </FieldRow>
            <FieldRow label="Email">
              <Input placeholder="email@example.com" type="email" value={adminEmail} onChange={(e: any) => setAdminEmail(e.target.value)} />
            </FieldRow>
            <FieldRow label="Contact Number">
              <Input placeholder="+91 XXXXX XXXXX" value={adminContact} onChange={(e: any) => setAdminContact(e.target.value)} />
            </FieldRow>
            <FieldRow label="Face Photo *">
              <FilePicker file={adminFile} onChange={setAdminFile} />
            </FieldRow>
          </div>
          <FieldRow label="Address">
            <textarea
              placeholder="Enter address…"
              value={adminAddress}
              onChange={(e: any) => setAdminAddress(e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </FieldRow>
          {addError   && <p className="text-sm text-red-500">{addError}</p>}
          {addSuccess && <p className="text-sm text-green-600">{addSuccess}</p>}
          <Button onClick={onAddUser} disabled={addLoading}>
            <UserPlus className="w-4 h-4 mr-2" />{addLoading ? "Adding…" : "Add User"}
          </Button>
        </div>
      </div>

    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general")
  const { isAdmin } = useUser()

  // Admin add-user form state
  const [adminName,    setAdminName]    = useState("")
  const [adminEmail,   setAdminEmail]   = useState("")
  const [adminContact, setAdminContact] = useState("")
  const [adminAddress, setAdminAddress] = useState("")
  const [adminFile,    setAdminFile]    = useState<File | null>(null)
  const [addLoading,   setAddLoading]   = useState(false)
  const [addError,     setAddError]     = useState("")
  const [addSuccess,   setAddSuccess]   = useState("")

  // User request form state
  const [reqName,    setReqName]    = useState("")
  const [reqFile,    setReqFile]    = useState<File | null>(null)
  const [reqLoading, setReqLoading] = useState(false)
  const [reqMsg,     setReqMsg]     = useState("")

  const [authUsers,   setAuthUsers]   = useState<AuthUser[]>([])
  const [authLoading, setAuthLoading] = useState(false)
  const [requests,    setRequests]    = useState<AccessRequest[]>([])
  const [reqsLoading, setReqsLoading] = useState(false)

  const [viewUser,   setViewUser]   = useState<AuthUser | null>(null)
  const [editUser,   setEditUser]   = useState<AuthUser | null>(null)
  const [deleteId,   setDeleteId]   = useState<number | null>(null)
  const [delLoading, setDelLoading] = useState(false)

  const visibleSections = adminSections.filter((s) => !s.adminOnly || isAdmin)

  // ── fetchers ───────────────────────────────────────────────────────────────
  const fetchAuthUsers = async () => {
    setAuthLoading(true)
    try {
      const res  = await fetch(`${MAIN_API}/api/authorized`)
      const data = await res.json()
      setAuthUsers(data)
    } catch (e) {
      console.error("fetchAuthUsers:", e)
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchRequests = async () => {
    setReqsLoading(true)
    try {
      const res  = await fetch(`${MAIN_API}/api/requests`)
      const data = await res.json()
      setRequests(data)
    } catch (e) {
      console.error("fetchRequests:", e)
    } finally {
      setReqsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin && activeSection === "users") {
      fetchAuthUsers()
      fetchRequests()
    }
  }, [isAdmin, activeSection])

  useEffect(() => {
    if (!isAdmin || activeSection !== "users") return
    const id = setInterval(fetchRequests, 15_000)
    return () => clearInterval(id)
  }, [isAdmin, activeSection])

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleAddUser = async () => {
    setAddError(""); setAddSuccess("")
    if (!adminName.trim()) { setAddError("Please enter a name.");  return }
    if (!adminFile)         { setAddError("Please choose a photo."); return }
    setAddLoading(true)
    const fd = new FormData()
    fd.append("name",    adminName.trim())
    fd.append("email",   adminEmail.trim())
    fd.append("contact", adminContact.trim())
    fd.append("address", adminAddress.trim())
    fd.append("image",   adminFile)
    try {
      const res  = await fetch(`${MAIN_API}/add-user`, { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to add user")
      setAddSuccess(`✅ User added! (ID: ${data.unique_id})`)
      setAdminName(""); setAdminEmail(""); setAdminContact(""); setAdminAddress(""); setAdminFile(null)
      await fetchAuthUsers()
    } catch (e: any) {
      setAddError(e.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDelLoading(true)
    try {
      await fetch(`${MAIN_API}/api/authorized/${deleteId}`, { method: "DELETE" })
      setAuthUsers((prev) => prev.filter((u) => u.person_id !== deleteId))
      setDeleteId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setDelLoading(false)
    }
  }

  // ✅ FIXED handleApprove — no reload-encodings call
  // The backend adds the encoding to memory directly inside approve_request().
  // Calling reload-encodings would race with the DB commit and wipe the new encoding.
  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${MAIN_API}/api/approve/${id}`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        console.error("Approve failed:", err)
        return
      }
      const data = await res.json()
      console.log(`Approved: ${data.name} (person_id=${data.person_id})`)

      // Remove from pending list immediately
      setRequests((prev) => prev.filter((r) => r.id !== id))

      // Re-fetch authorized list so the new user appears in the UI
      await fetchAuthUsers()

    } catch (e) {
      console.error("handleApprove error:", e)
    }
  }

  const handleReject = async (id: number) => {
    try {
      await fetch(`${MAIN_API}/api/reject/${id}`, { method: "POST" })
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleRequest = async () => {
    setReqMsg("")
    if (!reqName.trim()) { setReqMsg("Please enter your name."); return }
    if (!reqFile)         { setReqMsg("Please choose a photo."); return }
    setReqLoading(true)
    const fd = new FormData()
    fd.append("name",  reqName.trim())
    fd.append("image", reqFile)
    try {
      const res  = await fetch(`${MAIN_API}/api/request-access`, { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to send request")
      setReqMsg("✅ Request submitted! An admin will review it shortly.")
      setReqName(""); setReqFile(null)
    } catch (e: any) {
      setReqMsg(`❌ ${e.message}`)
    } finally {
      setReqLoading(false)
    }
  }

  return (
    <>
      {viewUser  && <ViewModal  user={viewUser} onClose={() => setViewUser(null)} />}
      {editUser  && <EditModal  user={editUser} onClose={() => setEditUser(null)} onSaved={fetchAuthUsers} />}
      {deleteId !== null && <DeleteDialog loading={delLoading} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{isAdmin ? "System Settings" : "User Settings"}</h1>

        <div className="grid lg:grid-cols-4 gap-6">

          {/* Left nav */}
          <div className="space-y-1">
            {visibleSections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm transition",
                  activeSection === s.id ? "bg-primary text-white font-medium" : "hover:bg-muted text-foreground"
                )}>
                <s.icon className="w-4 h-4 shrink-0" />{s.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="lg:col-span-3 space-y-6">

            {/* USER: Request Authorization */}
            {!isAdmin && (
              <div className="p-5 border rounded-xl space-y-3">
                <h3 className="font-semibold">Request Authorization</h3>
                <p className="text-sm text-muted-foreground">Submit your name and a clear front-facing photo. An admin will review your request.</p>
                <Input placeholder="Your full name" value={reqName} onChange={(e) => setReqName(e.target.value)} />
                <FilePicker file={reqFile} onChange={setReqFile} />
                <Button onClick={handleRequest} disabled={reqLoading}>{reqLoading ? "Sending…" : "Send Request"}</Button>
                {reqMsg && <p className={cn("text-sm", reqMsg.startsWith("✅") ? "text-green-600" : "text-red-500")}>{reqMsg}</p>}
              </div>
            )}

            {activeSection === "general"       && <GeneralSection       isAdmin={isAdmin} />}
            {activeSection === "notifications" && <NotificationsSection isAdmin={isAdmin} />}
            {isAdmin && activeSection === "storage"  && <StorageSection />}
            {isAdmin && activeSection === "security" && <SecuritySection />}
            {isAdmin && activeSection === "users" && (
              <UsersSection
                authUsers={authUsers}       authLoading={authLoading}
                requests={requests}         reqsLoading={reqsLoading}
                adminName={adminName}       setAdminName={setAdminName}
                adminEmail={adminEmail}     setAdminEmail={setAdminEmail}
                adminContact={adminContact} setAdminContact={setAdminContact}
                adminAddress={adminAddress} setAdminAddress={setAdminAddress}
                adminFile={adminFile}       setAdminFile={setAdminFile}
                addLoading={addLoading}     addError={addError} addSuccess={addSuccess}
                onAddUser={handleAddUser}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewUser={setViewUser}
                onEditUser={setEditUser}
                onSetDeleteId={setDeleteId}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
