"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, isTimed, METRICS, newId, today, UNIT, type Category, type Exercise, type Metric } from "@/lib/lifts";

const fieldLabel = "grid min-w-0 gap-1.5 text-sm font-medium";
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type LiftInput = { id: string; exerciseId: string; weight: number; date: string; note: string };

/** Log a lift. `exerciseId` preselects an exercise when opened from its leaderboard. */
export function LiftDialog({
  open,
  onOpenChange,
  exercises,
  groups,
  exerciseId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  /** How to list exercises (e.g. "Upper body · Popular" first). Defaults to one group per category. */
  groups?: ExerciseGroup[];
  exerciseId: string | null;
  onSave: (lift: LiftInput) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <LiftForm
            key={exerciseId ?? "any"}
            exercises={exercises}
            groups={groups ?? CATEGORIES.map(([c, label]) => ({ label, items: exercises.filter((x) => x.category === c) }))}
            exerciseId={exerciseId}
            onSave={onSave}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export type ExerciseGroup = { label: string; items: Exercise[] };

function LiftForm({
  exercises,
  groups,
  exerciseId,
  onSave,
  onDone,
}: {
  exercises: Exercise[];
  groups: ExerciseGroup[];
  exerciseId: string | null;
  onSave: (lift: LiftInput) => Promise<void>;
  onDone: () => void;
}) {
  const [exercise, setExercise] = useState(exerciseId ?? "");
  const [weight, setWeight] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const metric = exercises.find((x) => x.id === exercise)?.metric ?? "weight";
  const timed = isTimed(metric);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise) return setError("Pick an exercise.");
    let value: number;
    if (timed) {
      const m = Number(minutes || 0);
      const s = Number(seconds || 0);
      if (!Number.isInteger(m) || m < 0 || !Number.isInteger(s) || s < 0 || s > 59) return setError("Enter whole minutes and 0-59 seconds.");
      value = m * 60 + s;
      if (value <= 0) return setError("Enter your time.");
    } else {
      value = Number(weight);
      if (!Number.isFinite(value) || value <= 0) return setError("Enter the weight you lifted.");
      value = Math.round(value * 10) / 10;
    }
    if (!date) return setError("Pick the date.");
    setError("");
    setBusy(true);
    try {
      await onSave({ id: newId("lift"), exerciseId: exercise, weight: value, date, note: note.trim() });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4">
      <DialogHeader>
        <DialogTitle>Log a lift</DialogTitle>
        <DialogDescription>It shows on the leaderboard once one of your connections verifies it.</DialogDescription>
      </DialogHeader>
      <label className={fieldLabel}>
        Exercise
        <select className={selectClass} value={exercise} onChange={(e) => setExercise(e.target.value)} required>
          <option value="" disabled>
            Choose…
          </option>
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                    {isTimed(x.metric) ? " (time)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </label>
      {/* One column on phones so nothing (especially the date box) runs off screen. */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
        {timed ? (
          <fieldset className="grid min-w-0 gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">
              {metric === "time_min" ? "Time (fastest wins)" : "Time held (longest wins)"}
            </legend>
            <div className="flex min-w-0 items-center gap-2">
              <Input
                aria-label="Minutes"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="min"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
              <span className="text-muted-foreground font-semibold">:</span>
              <Input
                aria-label="Seconds"
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                step="1"
                placeholder="sec"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </div>
          </fieldset>
        ) : (
          <label className={fieldLabel}>
            Weight ({UNIT})
            <Input type="number" inputMode="decimal" min="0" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} required />
          </label>
        )}
        <label className={fieldLabel}>
          Date
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <label className={fieldLabel}>
        Note (optional)
        <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paused rep, belt, spotter Mike" />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Log lift"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Admin: every exercise with its lift count and a delete button. */
export function ManageExercisesDialog({
  open,
  onOpenChange,
  exercises,
  liftCount,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  liftCount: (exerciseId: string) => number;
  onDelete: (ex: Exercise) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage exercises</DialogTitle>
          <DialogDescription>Deleting an exercise also deletes every lift logged for it.</DialogDescription>
        </DialogHeader>
        <div className="-mx-2 max-h-[65svh] min-w-0 overflow-y-auto px-2">
          {CATEGORIES.map(([c, label]) => {
            const list = exercises.filter((x) => x.category === c);
            if (!list.length) return null;
            return (
              <div key={c} role="group" aria-label={label}>
                <p className="text-muted-foreground pt-3 pb-1 text-xs font-semibold tracking-wide uppercase">{label}</p>
                {list.map((x) => {
                  const n = liftCount(x.id);
                  return (
                    <div key={x.id} className="flex min-h-11 min-w-0 items-center gap-2 border-b py-1 last:border-b-0">
                      <span className="min-w-0 flex-1 truncate text-[15px] sm:text-sm">
                        {x.name}
                        {isTimed(x.metric) && <span className="text-muted-foreground"> (time)</span>}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {n} {n === 1 ? "lift" : "lifts"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${x.name}`}
                        className="text-muted-foreground hover:text-destructive size-11 shrink-0"
                        onClick={() => onDelete(x)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Add an exercise to a group (upper / lower / other), scored by weight or time. */
export function ExerciseDialog({
  open,
  onOpenChange,
  category,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onSave: (e: Exercise) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <ExerciseForm key={category} category={category} onSave={onSave} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function ExerciseForm({ category, onSave, onDone }: { category: Category; onSave: (e: Exercise) => Promise<void>; onDone: () => void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState<Category>(category);
  const [metric, setMetric] = useState<Metric>("weight");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the exercise a name.");
    setError("");
    setBusy(true);
    try {
      await onSave({ id: newId("ex"), name: name.trim(), category: cat, metric });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4">
      <DialogHeader>
        <DialogTitle>Add an exercise</DialogTitle>
        <DialogDescription>It gets its own leaderboard.</DialogDescription>
      </DialogHeader>
      <label className={fieldLabel}>
        Name
        <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deadlift" required />
      </label>
      <label className={fieldLabel}>
        Group
        <select className={selectClass} value={cat} onChange={(e) => setCat(e.target.value as Category)}>
          {CATEGORIES.map(([c, label]) => (
            <option key={c} value={c}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldLabel}>
        Scored by
        <select className={selectClass} value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          {METRICS.map(([m, label]) => (
            <option key={m} value={m}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add exercise"}
        </Button>
      </DialogFooter>
    </form>
  );
}
