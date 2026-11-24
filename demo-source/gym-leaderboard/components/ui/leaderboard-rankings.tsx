"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { UserBadges } from "@/components/ui/user-badge"

interface LeaderboardRankingItem {
  userId: string
  rank: number
  userName: string
  byline?: string
  value: number
  /** Set false to leave a row out of the list. */
  displayed?: boolean
  /** Small badges shown above the name. */
  badges?: { id: string; label: string; color: string; auto?: boolean }[]
  /** Short text under the value, e.g. the date it was set. */
  valueNote?: string
}

interface LeaderboardRankingsProps extends React.HTMLAttributes<HTMLDivElement> {
  rankings: LeaderboardRankingItem[]
  currentUserId?: string
  /** How many places to list (default 10). If the current user ranks below that,
      a highlighted card with their place ("23rd of 47") follows the list. */
  limit?: number
  formatValue?: (value: number) => string
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th", 23 -> "23rd". */
function ordinal(n: number) {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`
}

const LeaderboardRankings = React.forwardRef<HTMLDivElement, LeaderboardRankingsProps>(
  ({ className, rankings, currentUserId, limit = 10, formatValue = (v) => v.toLocaleString(), ...props }, ref) => {
    const rows = rankings.filter((r) => r.displayed !== false)
    const top = rows.slice(0, limit)
    const me = rows.find((r) => r.userId === currentUserId)
    const meOutside = me && !top.includes(me) ? me : null

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        <ol className="divide-border/60 divide-y">
          {top.map((r) => (
            <li key={r.userId}>
              <Row r={r} isYou={r.userId === currentUserId} formatValue={formatValue} />
            </li>
          ))}
        </ol>

        {rows.length > limit && (
          <p className="text-muted-foreground text-center text-xs">
            Top {limit} of {rows.length} ranked
          </p>
        )}

        {meOutside && (
          <div aria-label="Your place" className="pt-4">
            <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              <span className="bg-border h-px flex-1" aria-hidden="true" />
              Your place
              <span className="bg-border h-px flex-1" aria-hidden="true" />
            </div>
            <Row
              r={meOutside}
              isYou
              formatValue={formatValue}
              place={{ label: ordinal(meOutside.rank), of: rows.length }}
              className="bg-primary/5 ring-primary/20 shadow-sm ring-1"
            />
          </div>
        )}
      </div>
    )
  }
)

LeaderboardRankings.displayName = "LeaderboardRankings"

/** One ranking: position | badges over name | value over its note.
    With `place`, the position shows as "23rd" with "of 47" under it. */
function Row({
  r,
  isYou,
  formatValue,
  place,
  className,
}: {
  r: LeaderboardRankingItem
  isYou: boolean
  formatValue: (value: number) => string
  place?: { label: string; of: number }
  className?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-3 rounded-xl px-2 py-3", isYou && "bg-primary/5 ring-primary/15 ring-1", className)}
      aria-current={isYou ? "true" : undefined}
    >
      {place ? (
        <span className="flex w-12 shrink-0 flex-col items-center leading-none">
          <span className="text-base font-bold tabular-nums">{place.label}</span>
          <span className="text-muted-foreground mt-1 text-[11px] tabular-nums">of {place.of}</span>
        </span>
      ) : (
        <span className="text-muted-foreground w-7 shrink-0 text-center text-base font-semibold tabular-nums">{r.rank}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {(isYou || (r.badges && r.badges.length > 0)) && (
          <span className="flex min-w-0 items-center gap-1">
            {isYou && (
              <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold">
                You
              </span>
            )}
            {r.badges && <UserBadges badges={r.badges} max={3} />}
          </span>
        )}
        <span className="truncate text-[15px] leading-tight font-medium sm:text-sm">{r.userName}</span>
        {r.byline && <span className="text-muted-foreground block truncate text-[13px] sm:text-xs">{r.byline}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="text-[15px] leading-tight font-semibold tabular-nums sm:text-sm">{formatValue(r.value)}</span>
        {r.valueNote && <span className="text-muted-foreground text-xs leading-none tabular-nums">{r.valueNote}</span>}
      </span>
    </div>
  )
}

export { LeaderboardRankings, ordinal }
export type { LeaderboardRankingItem, LeaderboardRankingsProps }
