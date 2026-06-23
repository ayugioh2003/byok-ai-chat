// Tiny external store for per-run LLM speed stats. Lives outside React/messages
// so the numbers never pollute conversation content, context, or localStorage.
export type LlmStats = {
  ttftMs: number; // request sent → first token
  genMs: number; // first token → done
  promptTokens?: number; // from server usage (exact) if available
  completionTokens: number; // exact (usage) or estimated (chars/4)
  estimated: boolean;
};

let current: LlmStats | null = null;
const listeners = new Set<() => void>();

export function setStats(s: LlmStats | null) {
  current = s;
  listeners.forEach((l) => l());
}
export function getStats() {
  return current;
}
export function subscribeStats(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
