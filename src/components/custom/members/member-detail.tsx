import { MemberAvatar } from "./member-avatar"
import { MemberParty } from "./member-party"
import { Button } from "@/components/ui/button"
import { memberSourceLabel, type Member } from "@/lib/data/members"
import { ArrowLeft, ExternalLink } from "lucide-react"

const sourceUrl = (member: Member) =>
  member.source === "governo-portugal"
    ? "https://portugal.gov.pt/pt/gc25/governo/composicao"
    : "https://www.parlamento.pt/DeputadoGP/Paginas/Deputados.aspx"

type MemberDetailProps = {
  member?: Member
  error?: string
}

export const MemberDetail = ({ member, error }: MemberDetailProps) => {
  if (!member) {
    return (
      <div
        role="alert"
        className="grid min-h-80 place-items-center rounded-4xl border border-dashed p-8 text-center">
        <div>
          <p className="text-muted-foreground">{error}</p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              href="/classificacoes"
              leadingIcon={ArrowLeft}>
              Voltar à lista
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <article className="overflow-hidden rounded-4xl border bg-card shadow-sm">
      <div className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-10">
        <MemberAvatar
          member={member}
          className="size-28 text-2xl sm:size-40"
          eager
        />

        <div className="min-w-0 items-start self-center">
          <p className="text-sm font-semibold text-accent">
            {memberSourceLabel(member.source)}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {member.name}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {member.position}
          </p>
          {member.party ? (
            <div className="mt-3 flex flex-row items-center gap-2 py-1 text-sm">
              <p className="font-semibold">Partido:</p>
              <MemberParty
                abbreviation={member.party}
                name={member.party_name}
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              href="/classificacoes"
              leadingIcon={ArrowLeft}>
              Voltar à lista
            </Button>
            <Button
              variant="ghost"
              href={sourceUrl(member)}
              hrefTarget="_blank"
              trailingIcon={ExternalLink}>
              Fonte oficial
            </Button>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="avaliacao-title"
        className="border-t bg-muted/30 p-6 sm:p-10">
        <h2 id="avaliacao-title" className="text-xl font-bold">
          Classificação
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          As notas vão de 0 a 20. A funcionalidade para submeter e consultar
          avaliações será apresentada aqui.
        </p>
      </section>
    </article>
  )
}
