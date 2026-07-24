import { createServerAuth } from "@/lib/hooks/backend/server/services/auth"
import type { APIRoute } from "astro"

export const GET: APIRoute = async ({ url }) => {
  // params
  const userId = url.searchParams.get("userId")
  const secret = url.searchParams.get("secret")

  // validate params
  if (!userId || !secret) {
    return Response.json({ error: "missing params" }, { status: 400 })
  }

  // attempt to update user verification
  const { updateVerification } = createServerAuth()
  const result = await updateVerification({ userId, secret })

  // failure
  if (result instanceof Error) {
    return Response.json({ error: result.message }, { status: 500 })
  }

  // success
  return Response.json({ verified: result })
}
