"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SignalIcon } from "@/components/ui/signal-icon"
import {
  LeaderboardPodium,
  type LeaderboardRanking as LeaderboardPodiumRanking,
} from "@/components/ui/leaderboard-podium"
import {
  LeaderboardRankings,
  type LeaderboardRankingItem,
} from "@/components/ui/leaderboard-rankings"

interface LeaderboardRunOption {
  id: string
  label: string
  /** Options with a group are listed under that heading in the selector. */
  group?: string
  /** Small tag after the name, e.g. "Time". */
  tag?: string
  /** 0-5 signal bars shown next to the option (how busy that board is). */
  signal?: number
  /** Spoken/hover text for the signal icon, e.g. "4 people ranked". */
  signalLabel?: string
}

/* Based on the supplied leaderboard card, changed for an overall (all-time) board:
   the from/to date range is replaced by a plain subtitle, and it adds value formatting,
   an empty message and an actions row. */
interface LeaderboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  podiumRankings: LeaderboardPodiumRanking[]
  rankings: LeaderboardRankingItem[]
  currentUserId?: string
  /** Options for the selector in the top-right corner (here: the exercises in a group). */
  runOptions?: LeaderboardRunOption[]
  selectedRunId?: string
  onRunChange?: (runId: string) => void
  runLabel?: string
  formatValue?: (value: number) => string
  /** Shown instead of the podium and list when nobody has a ranking yet. */
  emptyMessage?: React.ReactNode
  /** A row of controls under the heading. */
  actions?: React.ReactNode
}

const LeaderboardCard = React.forwardRef<HTMLDivElement, LeaderboardCardProps>(
  (
    {
      className,
      title = "Leaderboard",
      subtitle,
      podiumRankings,
      rankings,
      currentUserId,
      runOptions,
      selectedRunId,
      onRunChange,
      runLabel = "Select leaderboard",
      formatValue,
      emptyMessage = "No rankings yet.",
      actions,
      ...props
    },
    ref
  ) => {
    const resolvedRunId = selectedRunId ?? runOptions?.[0]?.id ?? ""
    const hasOnRunChange = Boolean(onRunChange)
    const [localRunId, setLocalRunId] = React.useState(resolvedRunId)
    const [pickerOpen, setPickerOpen] = React.useState(false)
    const activeRunId = hasOnRunChange ? resolvedRunId : localRunId
    const active = runOptions?.find((o) => o.id === activeRunId)

    function choose(id: string) {
      setPickerOpen(false)
      if (onRunChange) onRunChange(id)
      else setLocalRunId(id)
    }

    return (
      <div
        ref={ref}
        className={cn("bg-card min-w-0 rounded-2xl border p-4 shadow-sm sm:p-6", className)}
        {...props}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-semibold">{title}</h3>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>

          {runOptions && runOptions.length > 0 ? (
            <>
              {/* A tap-to-open list instead of a native dropdown, because native options can't show icons. */}
              <button
                type="button"
                aria-label={`${runLabel}: ${active?.label ?? ""}`}
                aria-haspopup="dialog"
                onClick={() => setPickerOpen(true)}
                className="text-foreground flex min-h-11 w-full max-w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] sm:w-auto sm:min-w-56 sm:text-sm"
                // inline so host styles that reset buttons (e.g. the glass shell) can't remove the outline
                style={{ border: "1px solid var(--color-border, #e5e5e5)", background: "var(--color-background, #fff)" }}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{active?.label}</span>
                {active?.tag && <OptionTag>{active.tag}</OptionTag>}
                {active?.signal !== undefined && <SignalIcon level={active.signal} label={active.signalLabel} />}
                <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              </button>
              <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="gap-2 p-0 sm:max-w-md">
                  <DialogHeader className="px-4 pt-4">
                    <DialogTitle>{runLabel}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[70svh] overflow-y-auto px-2 pb-3">
                    {[...new Set(runOptions.map((o) => o.group))].map((group) => (
                      <div key={group ?? "ungrouped"} role="group" aria-label={group}>
                        {group && (
                          <p className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase">{group}</p>
                        )}
                        {runOptions
                          .filter((o) => o.group === group)
                          .map((o) => {
                            const selected = o.id === activeRunId
                            return (
                              <button
                                key={o.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => choose(o.id)}
                                className={cn(
                                  "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-[15px] sm:text-sm",
                                  selected ? "bg-muted font-semibold" : "hover:bg-muted/60"
                                )}
                              >
                                <Check className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                                {o.tag && <OptionTag>{o.tag}</OptionTag>}
                                {o.signal !== undefined && <SignalIcon level={o.signal} label={o.signalLabel} />}
                              </button>
                            )
                          })}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
        </div>

        {actions && <div className="mb-5 flex flex-wrap items-center gap-2">{actions}</div>}

        {rankings.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
        ) : (
          <>
            <LeaderboardPodium
              rankings={podiumRankings}
              currentUserId={currentUserId}
              formatValue={formatValue}
              className="mb-6"
            />
            <LeaderboardRankings
              rankings={rankings}
              currentUserId={currentUserId}
              formatValue={formatValue}
              limit={10}
            />
          </>
        )}
      </div>
    )
  }
)

LeaderboardCard.displayName = "LeaderboardCard"

function OptionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-semibold uppercase">
      {children}
    </span>
  )
}

export { LeaderboardCard }
export type { LeaderboardCardProps, LeaderboardRunOption }
