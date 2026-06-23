import { useSyncExternalStore } from "react";
import { getStats, subscribeStats } from "@/lib/stats";

export function StatsBar() {
  const s = useSyncExternalStore(subscribeStats, getStats);
  if (!s) return null;

  const outTps = s.genMs > 0 ? s.completionTokens / (s.genMs / 1000) : 0;
  const inTps =
    s.promptTokens != null && s.ttftMs > 0 ? s.promptTokens / (s.ttftMs / 1000) : null;

  return (
    <div className="bg-background/90 text-muted-foreground pointer-events-none fixed top-2 right-3 z-50 rounded-md border px-2.5 py-1 font-mono text-xs backdrop-blur">
      TTFT {(s.ttftMs / 1000).toFixed(2)}s
      <span className="mx-1.5 opacity-40">·</span>
      out {s.completionTokens}
      {s.estimated ? "~" : ""} tok @ {outTps.toFixed(1)} tok/s
      {s.promptTokens != null && (
        <>
          <span className="mx-1.5 opacity-40">·</span>
          in {s.promptTokens} tok{inTps != null ? ` @ ${Math.round(inTps)} tok/s` : ""}
        </>
      )}
    </div>
  );
}
