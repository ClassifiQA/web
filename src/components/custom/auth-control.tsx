import { useState } from "react"
import { User } from "lucide-react"
import { AuthDialog } from "@/components/custom/dialogs/auth"
import { Button } from "@/components/ui/button"

export const AuthControl = () => {
  // dialog state
  const [open, setOpen] = useState(false)

  // ui
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <User />A Minha Conta
      </Button>

      <AuthDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
