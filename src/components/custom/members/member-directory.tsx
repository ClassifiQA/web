import { MemberAvatar } from "./member-avatar"
import { MemberParty } from "./member-party"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import {
  memberHref,
  memberSourceLabel,
  type Member,
  type MemberSource,
} from "@/lib/data/members"
import { ArrowUpRight, Search } from "lucide-react"
import { useMemo, useState } from "react"

type SourceFilter = "all" | MemberSource

const PAGE_SIZE = 9

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT")

type MemberDirectoryProps = {
  members: Member[]
}

export const MemberDirectory = ({ members }: MemberDirectoryProps) => {
  const [search, setSearch] = useState("")
  const [source, setSource] = useState<SourceFilter>("all")
  const [page, setPage] = useState(1)

  const filteredMembers = useMemo(() => {
    const term = normalized(search.trim())

    return members.filter((member) => {
      if (source !== "all" && member.source !== source) return false
      if (!term) return true

      return normalized(
        [member.name, member.position, member.party, member.party_name]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    })
  }, [members, search, source])

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleMembers = filteredMembers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const governmentCount = members.filter(
    (member) => member.source === "governo-portugal"
  ).length
  const parliamentCount = members.filter(
    (member) => member.source === "parlamento-ar"
  ).length
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages = new Set([
      1,
      totalPages,
      currentPage - 1,
      currentPage,
      currentPage + 1,
    ])
    const visiblePages = [...pages]
      .filter((item) => item >= 1 && item <= totalPages)
      .sort((left, right) => left - right)
    const items: Array<number | "ellipsis"> = []

    visiblePages.forEach((item, index) => {
      const previous = visiblePages[index - 1]
      if (previous && item - previous > 1) items.push("ellipsis")
      items.push(item)
    })

    return items
  }, [currentPage, totalPages])

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 grid shrink-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Pesquisar por nome, cargo ou partido</span>
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Pesquisar por nome, cargo ou partido…"
            className="h-10 w-full rounded-full border bg-background pr-4 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div
          className="flex gap-1 rounded-full bg-muted p-1"
          aria-label="Filtrar por instituição">
          {(
            [
              ["all", "Todos"],
              ["governo-portugal", "Governo"],
              ["parlamento-ar", "Assembleia"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={source === value}
              onClick={() => {
                setSource(value)
                setPage(1)
              }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
        <span>{members.length} em funções</span>
        <span>{governmentCount} no Governo</span>
        <span>{parliamentCount} na Assembleia</span>
      </div>

      {visibleMembers.length ? (
        <>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ul className="grid h-full grid-cols-3 grid-rows-3 gap-2">
              {visibleMembers.map((member) => (
                <li key={member.$id}>
                  <Button
                    href={memberHref(member.$id)}
                    variant="outline"
                    className="group grid h-full min-h-0 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-stretch gap-2 rounded-2xl border bg-card p-2 text-left whitespace-normal transition-colors hover:border-accent/40 hover:bg-muted/40 sm:gap-3 sm:p-2.5">
                    <MemberAvatar
                      member={member}
                      className="hidden size-10 sm:flex lg:size-12"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-xs font-bold sm:text-sm">
                        {member.name}
                      </h2>
                      <p className="mt-0.5 hidden truncate text-[0.6875rem] text-muted-foreground sm:block">
                        {member.position}
                      </p>
                      <p className="mt-1 truncate text-[0.6875rem] font-semibold text-accent">
                        {member.party ? (
                          <MemberParty
                            abbreviation={member.party}
                            name={member.party_name}
                          />
                        ) : (
                          memberSourceLabel(member.source)
                        )}
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="hidden size-4 shrink-0 text-muted-foreground group-hover:text-accent lg:block"
                    />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {totalPages > 1 ? (
            <Pagination className="shrink-0 pt-3">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`#pagina-${Math.max(currentPage - 1, 1)}`}
                    aria-disabled={currentPage === 1}
                    tabIndex={currentPage === 1 ? -1 : undefined}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault()
                      goToPage(currentPage - 1)
                    }}
                  />
                </PaginationItem>

                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={`#pagina-${item}`}
                        isActive={item === currentPage}
                        aria-label={`Ir para a página ${item}`}
                        onClick={(event) => {
                          event.preventDefault()
                          goToPage(item)
                        }}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href={`#pagina-${Math.min(currentPage + 1, totalPages)}`}
                    aria-disabled={currentPage === totalPages}
                    tabIndex={currentPage === totalPages ? -1 : undefined}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault()
                      goToPage(currentPage + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center overflow-hidden rounded-3xl border border-dashed p-8 text-center">
          <div>
            <p className="font-semibold">Nenhum resultado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Experimenta outro nome, cargo ou partido.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
