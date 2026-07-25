import { useState } from "react"

import { memberInitials, type Member } from "@/lib/data/members"
import { cn } from "@/lib/utils"

type MemberAvatarProps = {
  member: Pick<Member, "name" | "image_url">
  className?: string
  eager?: boolean
}

export const MemberAvatar = ({
  member,
  className,
  eager = false,
}: MemberAvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(member.image_url) && !imageFailed

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15",
        className
      )}>
      {showImage ? (
        <img
          src={member.image_url ?? undefined}
          alt=""
          className="size-full object-cover object-top"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center text-center">
          {memberInitials(member.name)}
        </span>
      )}
    </div>
  )
}
