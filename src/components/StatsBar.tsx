import { useSyncExternalStore } from "react";
import { Zap, Timer, ArrowUp, ArrowDown, X } from "lucide-react";
import { getStats, subscribeStats } from "@/lib/stats";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const inTps =
    s.promptTokens != null && s.ttftMs > 0 ? s.promptTokens / (s.ttftMs / 1000) : null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-3 rounded-full border bg-background/80 py-1.5 pr-1.5 pl-3 text-xs shadow-sm backdrop-blur-md">
      {/* output speed — the most trustworthy number, emphasised */}
      <Tooltip>
        <TooltipTrigger render={<span className="flex items-baseline gap-1" />}>
          <Zap className="size-3.5 shrink-0 translate-y-0.5 text-amber-500" />
          <span className="text-sm font-semibold tabular-nums">{outTps.toFixed(1)}</span>
          <span className="text-muted-foreground">tok/s</span>
          {s.estimated && <span className="text-muted-foreground/70">~</span>}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          輸出速度：每秒產生的 token 數（含 thinking）。端到端觀測，最可信。
          {s.estimated ? " ~ = token 數為估算。" : ""}
        </TooltipContent>
      </Tooltip>

      <span className="bg-border h-4 w-px" />

      <Tooltip>
        <TooltipTrigger
          render={<span className="text-muted-foreground flex items-center gap-1" />}
        >
          <Timer className="size-3.5 shrink-0" />
          <span className="tabular-nums">{(s.ttftMs / 1000).toFixed(2)}s</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          TTFT（首 token 延遲）：送出到看到第一個字。含網路與排隊，當「體驗延遲」看。
        </TooltipContent>
      </Tooltip>

      <span className="bg-border h-4 w-px" />

      {/* input: prompt tokens + approximate prefill speed */}
      <Tooltip>
        <TooltipTrigger
          render={<span className="text-muted-foreground flex items-center gap-1" />}
        >
          <ArrowUp className="size-3 shrink-0" />
          <span className="tabular-nums">{s.promptTokens ?? "–"}</span>
          {inTps != null && (
            <span className="text-muted-foreground/70 tabular-nums">
              ~{Math.round(inTps)}/s
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          輸入：送進去的 prompt token 數（含歷史，精準）。~{inTps != null ? Math.round(inTps) : "?"}
          /s 是 prefill 速度概估（token ÷ TTFT，含網路，僅供參考）。
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={<span className="text-muted-foreground flex items-center gap-1" />}
        >
          <ArrowDown className="size-3 shrink-0" />
          <span className="tabular-nums">{s.completionTokens}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          輸出：模型產生的 token 數（含 thinking，精準）。越大越花時間與費用。
        </TooltipContent>
      </Tooltip>

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
