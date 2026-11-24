"use client"

import * as React from "react"
import { Crown } from "lucide-react"

import { cn } from "@/lib/utils"

interface LeaderboardRanking {
  userId: string
  userName: string
  rank: number
  value: number
}

interface LeaderboardPodiumProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The top three. Missing places show as empty steps. */
  rankings: LeaderboardRanking[]
  currentUserId?: string
  formatValue?: (value: number) => string
}

const PLACES = {
  1: { step: "h-24", avatar: "size-16 text-lg", ring: "ring-amber-400", badge: "bg-amber-400 text-amber-950" },
  2: { step: "h-16", avatar: "size-12 text-sm", ring: "ring-slate-300", badge: "bg-slate-300 text-slate-900" },
  3: { step: "h-11", avatar: "size-12 text-sm", ring: "ring-orange-300", badge: "bg-orange-300 text-orange-950" },
} as const

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

const LeaderboardPodium = React.forwardRef<HTMLDivElement, LeaderboardPodiumProps>(
  ({ className, rankings, currentUserId, formatValue = (v) => v.toLocaleString(), ...props }, ref) => {
    // Classic podium order: 2nd on the left, 1st in the middle, 3rd on the right.
    const order = [2, 1, 3] as const

    return (
      <div
        ref={ref}
        className={cn("grid grid-cols-3 items-end gap-2 sm:gap-3", className)}
        aria-label="Top three"
        {...props}
      >
        {order.map((place) => {
          const r = rankings.find((x) => x.rank === place)
          const style = PLACES[place]
          const isYou = r && r.userId === currentUserId
          return (
            <div key={place} className="flex min-w-0 flex-col items-center">
              {place === 1 && <Crown className="mb-1 size-5 text-amber-500" aria-hidden="true" />}
              <div
                className={cn(
                  "bg-muted text-foreground grid place-items-center rounded-full font-semibold ring-2 ring-offset-2 ring-offset-card",
                  style.avatar,
                  r ? style.ring : "ring-transparent opacity-40"
                )}
                aria-hidden="true"
              >
                {r ? initials(r.userName) : "–"}
              </div>
              <p
                className={cn(
                  "mt-2 w-full truncate text-center text-sm font-medium",
                  !r && "text-muted-foreground"
                )}
              >
                {r ? (isYou ? "You" : r.userName) : "Open spot"}
              </p>
              <p
                className={cn(
                  "text-muted-foreground text-xs tabular-nums",
                  place === 1 && r && "text-foreground text-sm font-semibold"
                )}
              >
                {r ? formatValue(r.value) : " "}
              </p>
              <div
                className={cn(
                  "bg-muted/70 mt-2 flex w-full items-start justify-center rounded-t-xl pt-2",
                  style.step
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-bold",
                    r ? style.badge : "bg-background text-muted-foreground"
                  )}
                >
                  {place}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)

LeaderboardPodium.displayName = "LeaderboardPodium"

export { LeaderboardPodium }
export type { LeaderboardPodiumProps, LeaderboardRanking }
