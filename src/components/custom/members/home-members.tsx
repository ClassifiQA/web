import { Badge } from "@/components/ui/badge"
import { MemberAvatar } from "./member-avatar"
import { MemberParty } from "./member-party"
import { Button } from "@/components/ui/button"
import { memberHref, memberSourceLabel, type Member } from "@/lib/data/members"
import { isNumber, mean } from "es-toolkit"
import { ArrowRight, ArrowUpRight, RotateCw } from "lucide-react"

type HomeMembersProps = {
  members: Member[]
  error?: string
}

export const HomeMembers = ({ members, error }: HomeMembersProps) => {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex flex-col items-start gap-2 lg:mb-4 lg:flex-row lg:items-end lg:justify-between lg:gap-3">
        <div>
          <h2
            id="classificacoes-title"
            className="text-xl font-bold tracking-tight lg:text-2xl">
            Quem podes avaliar agora
          </h2>
          <p className="mt-1 max-w-md text-sm leading-snug text-muted-foreground lg:text-base">
            Membros em funções, atualizados a partir de fontes oficiais.
          </p>
        </div>

        {!error ? (
          <div
            role="status"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:gap-2 sm:text-sm lg:bg-transparent lg:px-0 lg:py-0">
            <span
              aria-hidden="true"
              className="size-2 animate-pulse rounded-full bg-emerald-500 sm:size-2.5"
            />
            <span>Dados atualizados</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-5 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            href="/"
            variant="link"
            leadingIcon={RotateCw}
            className="text-sm font-semibold text-accent">
            Recarregar página
          </Button>
        </div>
      ) : (
        <ol className="space-y-3">
          {members.map((member) => (
            <li key={member.$id}>
              <Button
                href={memberHref(member.$id)}
                variant="ghost"
                className="group grid min-h-[4.5rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-stretch gap-3 rounded-2xl border bg-card px-4 py-3 text-left whitespace-normal shadow-sm transition-colors hover:border-accent/40 hover:bg-muted/50 lg:min-h-18 lg:px-5">
                <MemberAvatar
                  member={member}
                  className="size-11 lg:size-12"
                  eager
                />

                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold sm:text-lg">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                    {member.position}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* current grade mean */}
                  <Badge variant="secondary">
                    {member.grades.length
                      ? `${
                          Math.round(
                            mean(member.grades.map(({ grade }) => grade)) * 10
                          ) / 10
                        } / 20`
                      : "Sem Classificações"}
                  </Badge>

                  <ArrowUpRight
                    aria-hidden="true"
                    size={17}
                    className="text-muted-foreground transition-colors group-hover:text-accent"
                  />
                </div>
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Button
        href="/classificacoes"
        variant="link"
        trailingIcon={ArrowRight}
        className="mt-4 h-auto justify-start p-0 text-sm font-semibold text-accent lg:mt-4">
        Ver todas as pessoas
      </Button>
    </div>
  )
}
