import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type MemberPartyProps = {
  abbreviation: string
  name?: string | null
  className?: string
}

export const MemberParty = ({
  abbreviation,
  name,
  className,
}: MemberPartyProps) => {
  const label = (
    <span className={cn("inline-flex", className)}>{abbreviation}</span>
  )

  if (!name || name === abbreviation) return label

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={`${abbreviation}: ${name}`}
            className={cn("inline-flex", className)}
            tabIndex={0}>
            {abbreviation}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={6} className="text-xs">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
