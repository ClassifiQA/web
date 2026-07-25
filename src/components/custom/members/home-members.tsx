import { MemberAvatar } from "./member-avatar"
import { MemberParty } from "./member-party"
import { Button } from "@/components/ui/button"
import { memberHref, memberSourceLabel, type Member } from "@/lib/data/members"
import { ArrowRight, ArrowUpRight, RotateCw } from "lucide-react"

type HomeMembersProps = {
  members: Member[]
  error?: string
}

export const HomeMembers = ({ members, error }: HomeMembersProps) => {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-3 flex items-end justify-between gap-3 lg:mb-4">
        <div>
          <h2
            id="classificacoes-title"
            className="text-lg font-bold tracking-tight lg:text-2xl">
            Quem podes avaliar agora
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground lg:text-base">
            Membros em funções, atualizados a partir de fontes oficiais.
          </p>
        </div>

        {!error ? (
          <div
            role="status"
            className="flex shrink-0 items-center gap-1.5 pb-0.5 text-xs font-semibold text-muted-foreground sm:gap-2 sm:text-sm">
            <span
              aria-hidden="true"
              className="size-2 animate-pulse rounded-full bg-emerald-500 sm:size-2.5"
            />
            <span className="hidden sm:inline">Dados atualizados</span>
            <span className="sm:hidden">Atualizado</span>
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
        <ol className="space-y-2 lg:space-y-3">
          {members.map((member) => (
            <li key={member.$id}>
              <Button
                href={memberHref(member.$id)}
                variant="ghost"
                className="group grid min-h-15 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-stretch gap-3 rounded-xl border bg-card px-3 py-2 text-left whitespace-normal transition-colors hover:border-accent/40 hover:bg-muted/50 lg:min-h-18 lg:rounded-2xl lg:px-5 lg:py-3">
                <MemberAvatar
                  member={member}
                  className="size-10 lg:size-12"
                  eager
                />

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold sm:text-lg">
                    {member.name}
                  </h3>
                  <p className="truncate text-[0.6875rem] text-muted-foreground sm:text-sm">
                    {member.position}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:inline">
                    {member.party ? (
                      <MemberParty
                        abbreviation={member.party}
                        name={member.party_name}
                      />
                    ) : (
                      memberSourceLabel(member.source)
                    )}
                  </span>
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
        className="mt-3 h-auto justify-start p-0 text-xs font-semibold text-accent sm:text-sm lg:mt-4">
        Ver todas as pessoas
      </Button>
    </div>
  )
}
