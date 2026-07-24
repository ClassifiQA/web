import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// merge tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * returns error message or string representation of error
 */
export function parseError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * error page for astro-based returns
 */
export const errorPage = (errorMsg: string, status = 404) => {
  const body = `<!DOCTYPE html>
 <head>
   <title>${status}</title>
 </head>
 <h1>${status}</h1><p>${errorMsg}</p>
 <a href='/'>Home</a>
 `
  const headers = { "Content-type": "text/html" }
  return new Response(body, { status, headers })
}

/**
 * displays a toast notification
 *
 * TODO: implement action support
 *
 * @param type - notification type
 * @param title - notification title
 * @param description - notification description
 */
export async function notify(
  type: "success" | "error" | "warning",
  title?: string,
  description?: string
) {
  if (typeof window === "undefined") return

  const { toast } = await import("sonner")
  toast[type](title, { description })
}

/**
 * capitalize first character of given string
 *
 * @param data - string to modify
 */
export const upperFirstLetter = (data: string = "") => {
  return data.slice(0, 1).toUpperCase() + data.slice(1, data.length)
}
