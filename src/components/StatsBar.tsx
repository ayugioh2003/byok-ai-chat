import { useSyncExternalStore } from "react";
import { ArrowUp, ArrowDown, Timer, X } from "lucide-react";
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

  // shared column widths so the two rows line up
  const col1 = "flex w-14 shrink-0 items-center gap-1 text-muted-foreground";
  const col2 = "w-20 text-right tabular-nums";
  const col3 = "w-24 text-right tabular-nums text-muted-foreground";
  const unit = "text-muted-foreground ml-0.5";

  return (
    <div className="fixed top-16 right-3 z-50 rounded-lg border bg-background/80 py-2 pr-2 pl-3 text-xs shadow-sm backdrop-blur-md">
      <button
        onClick={onDismiss}
        title="隱藏測速（可在設定開回）"
        className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-1 right-1 rounded p-1 transition-colors"
      >
        <X className="size-3" />
      </button>

      <div className="flex flex-col gap-1 pr-5">
        {/* input row */}
        <Tooltip>
          <TooltipTrigger render={<div className="flex items-center" />}>
            <span className={col1}>
              <ArrowUp className="size-3 shrink-0" />
              輸入
            </span>
            <span className={col2}>
              {s.promptTokens ?? "–"}
              <span className={unit}>tok</span>
            </span>
            <span className={col3}>
              {inTps != null ? `~${Math.round(inTps)}` : "–"}
              <span className={unit}>tok/s</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            輸入 prompt 的 token 數（含歷史，精準）。tok/s 為 prefill 速度概估（token ÷ TTFT，含網路，僅供參考）。
          </TooltipContent>
        </Tooltip>

        {/* output row */}
        <Tooltip>
          <TooltipTrigger render={<div className="flex items-center" />}>
            <span className={col1}>
              <ArrowDown className="size-3 shrink-0" />
              輸出
            </span>
            <span className={col2}>
              {s.estimated ? "~" : ""}
              {s.completionTokens}
              <span className={unit}>tok</span>
            </span>
            <span className={col3}>
              {outTps.toFixed(1)}
              <span className={unit}>tok/s</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            模型產生的 token 數（含 thinking，精準）與輸出速度（端到端觀測，最可信）。越大越花時間與費用。
          </TooltipContent>
        </Tooltip>

        {/* TTFT row */}
        <Tooltip>
          <TooltipTrigger render={<div className="flex items-center" />}>
            <span className={col1}>
              <Timer className="size-3 shrink-0" />
              首字
            </span>
            <span className={col2}>
              {(s.ttftMs / 1000).toFixed(2)}
              <span className={unit}>s</span>
            </span>
            <span className="w-24" />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            TTFT（首 token 延遲）：送出到看到第一個字。含網路與排隊，當「體驗延遲」看。
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
