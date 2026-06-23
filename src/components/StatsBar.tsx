import { useSyncExternalStore } from "react";
import { Zap, Timer, ArrowUp, ArrowDown, X } from "lucide-react";
import { getStats, subscribeStats } from "@/lib/stats";

export function StatsBar({
  enabled,
  onDismiss,
}: {
  enabled: boolean;
  onDismiss: () => void;
}) {
  const s = useSyncExternalStore(subscribeStats, getStats);
  if (!enabled || !s) return null;

  const outTps = s.genMs > 0 ? s.completionTokens / (s.genMs / 1000) : 0;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-3 rounded-full border bg-background/80 py-1.5 pr-1.5 pl-3 text-xs shadow-sm backdrop-blur-md">
      {/* output speed — the most trustworthy number, emphasised */}
      <span className="flex items-baseline gap-1" title="輸出速度（端到端觀測）">
        <Zap className="size-3.5 shrink-0 translate-y-0.5 text-amber-500" />
        <span className="text-sm font-semibold tabular-nums">{outTps.toFixed(1)}</span>
        <span className="text-muted-foreground">tok/s</span>
        {s.estimated && <span className="text-muted-foreground/70">~</span>}
      </span>

      <span className="bg-border h-4 w-px" />

      <span className="text-muted-foreground flex items-center gap-1" title="首 token 延遲（含網路）">
        <Timer className="size-3.5 shrink-0" />
        <span className="tabular-nums">{(s.ttftMs / 1000).toFixed(2)}s</span>
      </span>

      <span className="bg-border h-4 w-px" />

      <span className="text-muted-foreground flex items-center gap-2" title="輸入 / 輸出 tokens">
        <span className="flex items-center gap-0.5">
          <ArrowUp className="size-3 shrink-0" />
          <span className="tabular-nums">{s.promptTokens ?? "–"}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <ArrowDown className="size-3 shrink-0" />
          <span className="tabular-nums">{s.completionTokens}</span>
        </span>
      </span>

      <button
        onClick={onDismiss}
        title="隱藏測速（可在設定開回）"
        className="text-muted-foreground hover:bg-accent hover:text-foreground ml-0.5 rounded-full p-1 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
