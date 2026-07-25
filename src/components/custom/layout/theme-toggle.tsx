import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  applyThemePreference,
  getNextTheme,
  getThemePreference,
  initThemeDocument,
  type ThemePreference,
  useThemePreference,
} from "@/lib/hooks/theme"

function ariaLabelForNext(preference: ThemePreference): string {
  const next = getNextTheme(preference)
  if (next === "dark") {
    return "Use dark theme"
  }
  if (next === "system") {
    return "Use system theme"
  }
  return "Use light theme"
}

export function ThemeToggle() {
  const preference = useThemePreference()
  const ariaLabel = ariaLabelForNext(preference)

  React.useEffect(() => {
    initThemeDocument()
  }, [])

  const cycle = () => {
    const current = getThemePreference()
    const next = getNextTheme(current)
    applyThemePreference(next)
  }

  return (
    <Button
      className="theme-toggle hover:cursor-pointer"
      variant="ghost"
      type="button"
      onClick={cycle}
      aria-label={ariaLabel}>
      <Moon
        className="theme-toggle-icon theme-toggle-icon--next-dark size-5"
        aria-hidden
      />
      <Monitor
        className="theme-toggle-icon theme-toggle-icon--next-system size-5"
        aria-hidden
      />
      <Sun
        className="theme-toggle-icon theme-toggle-icon--next-light size-5"
        aria-hidden
      />
    </Button>
  )
}
