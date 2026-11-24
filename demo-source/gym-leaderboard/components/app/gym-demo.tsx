"use client";

import { useMemo, useSyncExternalStore } from "react";
import GymApp from "@/components/app/gym-app";
import { derive, getDb, getVersion, subscribe } from "@/lib/demo-store";

/* Nothing time-dependent is rendered on the server: wait until the browser is ready, then read the demo store. */
const noop = () => () => {};

export default function GymDemo() {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  if (!ready) return <div style={{ minHeight: "100svh" }} aria-busy="true" />;
  return <Loaded />;
}

function Loaded() {
  const version = useSyncExternalStore(subscribe, getVersion, () => 0);
  const data = useMemo(() => derive(getDb()), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <GymApp
      user={data.me}
      team={data.team}
      exercises={data.exercises}
      lifts={data.lifts}
      badges={data.badges}
      people={data.people}
      connections={data.connections}
      initialExercise="ex-bench-press"
    />
  );
}
