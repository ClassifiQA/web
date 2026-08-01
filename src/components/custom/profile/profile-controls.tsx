import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  useId,
} from "react"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import type { ProfileForm } from "./profile-model"

type ProfileFieldProps = {
  label: string
  name: keyof ProfileForm
  type?: InputHTMLAttributes<HTMLInputElement>["type"]
  form: ProfileForm
  editing: boolean
  onChange: (name: keyof ProfileForm, value: string) => void
}

export const ProfileField = ({
  label,
  name,
  type = "text",
  form,
  editing,
  onChange,
}: ProfileFieldProps) => {
  // ui
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <input
        type={type}
        value={form[name]}
        disabled={!editing}
        required={name === "name" || name === "email"}
        maxLength={name === "name" ? 128 : name === "email" ? 320 : 256}
        onChange={(event) => onChange(name, event.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground"
      />
    </label>
  )
}

// props
type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export const PasswordField = ({ label, ...props }: PasswordFieldProps) => {
  // ui
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <input
        type="password"
        maxLength={256}
        className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </label>
  )
}

// props
type ProfileButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger"
}

export const ProfileButton = ({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ProfileButtonProps) => {
  // ui
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-accent text-accent-foreground hover:bg-accent/80",
        variant === "secondary" &&
          "border border-border bg-background text-foreground hover:bg-muted",
        variant === "danger" &&
          "border border-destructive/20 bg-background text-destructive hover:bg-destructive/10",
        className
      )}
      {...props}>
      {children}
    </button>
  )
}

// props
type PreferenceToggleProps = {
  checked: boolean
  description: string
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}

export const PreferenceToggle = ({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: PreferenceToggleProps) => {
  const descriptionId = useId()

  // ui
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 sm:items-center sm:gap-6">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={descriptionId}
        aria-label={label}
        disabled={disabled}
      />
    </div>
  )
}
