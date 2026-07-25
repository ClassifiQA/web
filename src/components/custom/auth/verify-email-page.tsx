import { Button } from "@/components/ui/button"
import { useClientAuth } from "@/lib/hooks/backend/client/services/auth"
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react"
import { useEffect, useState } from "react"

type VerificationState =
  { type: "loading" } | { type: "success" } | { type: "error"; message: string }

export const VerifyEmailPage = () => {
  // auth
  const { confirmEmailVerification } = useClientAuth()

  // verification state
  const [state, setState] = useState<VerificationState>({ type: "loading" })

  // verify link
  useEffect(() => {
    const verifyLink = async () => {
      const params = new URLSearchParams(window.location.search)
      const userId = params.get("userId") ?? ""
      const secret = params.get("secret") ?? ""
      const result = await confirmEmailVerification(userId, secret)

      if (result instanceof Error) {
        setState({ type: "error", message: result.message })
        return
      }

      setState({ type: "success" })
    }

    void verifyLink()
  }, [confirmEmailVerification])

  // ui
  return (
    <div className="grid min-h-72 flex-1 place-items-center px-5">
      <div
        role="status"
        aria-live="polite"
        aria-busy={state.type === "loading"}
        className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {state.type === "loading" ? (
          <>
            <LoaderCircle
              className="mx-auto size-8 animate-spin text-accent"
              aria-hidden
            />
            <h1 className="mt-4 text-xl font-semibold">
              A confirmar o teu e-mail…
            </h1>
          </>
        ) : null}

        {state.type === "success" ? (
          <>
            <CircleCheck className="mx-auto size-10 text-accent" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold">E-mail confirmado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              O teu endereço foi confirmado com sucesso.
            </p>
            <Button className="mt-6" href="/perfil">
              Voltar ao perfil
            </Button>
          </>
        ) : null}

        {state.type === "error" ? (
          <>
            <CircleAlert
              className="mx-auto size-10 text-destructive"
              aria-hidden
            />
            <h1 className="mt-4 text-xl font-semibold">
              Não foi possível confirmar
            </h1>
            <p className="mt-2 text-sm text-muted-foreground" role="alert">
              {state.message}
            </p>
            <Button className="mt-6" href="/perfil">
              Tentar novamente no perfil
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
