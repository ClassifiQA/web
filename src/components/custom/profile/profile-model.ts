import { Bell, LockKeyhole, UserRound } from "lucide-react"

import type { MfaSetupResult } from "@/lib/hooks/backend/client/services/auth"
import type { AuthUser, NotificationPreferences } from "@/lib/store/auth"

export type PanelId = "profile" | "security" | "notifications"

export type ProfileForm = {
  name: string
  email: string
  role: string
  school: string
}

export type Feedback = {
  type: "success" | "error"
  message: string
}

export type MfaSetup = Extract<MfaSetupResult, { type: "setup" }>
export type MfaProtectedAction = "reuse" | "recovery" | "reconfigure"

export const defaultNotifications: NotificationPreferences = {
  replies: true,
  security: true,
  browser: false,
}

// profile panels
export const panelNavigation: {
  id: PanelId
  label: string
  icon: typeof UserRound
}[] = [
  { id: "profile", label: "Dados pessoais", icon: UserRound },
  { id: "security", label: "Segurança", icon: LockKeyhole },
  { id: "notifications", label: "Notificações", icon: Bell },
]

export const profilePanelClassName =
  "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"

// map an Appwrite user to the editable form
export const getProfileForm = (user: AuthUser): ProfileForm => {
  return {
    name: user.name,
    email: user.email,
    role: user.prefs.profile?.role ?? "",
    school: user.prefs.profile?.school ?? "",
  }
}

// derive initials from the account name
export const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

// format a session date in European Portuguese
export const formatSessionDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

// props
