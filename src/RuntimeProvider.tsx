import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { loadSettings, makeHistoryAdapter } from "@/lib/storage";
import { setStats } from "@/lib/stats";

// baseURL may be "https://host", "https://host/", or "https://host/v1".
// Normalise to the chat-completions endpoint.
function chatEndpoint(baseURL: string): string {
  const b = baseURL.replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(b)) return b;
  if (/\/v1$/.test(b)) return b + "/chat/completions";
  return b + "/v1/chat/completions";
}

// Inline reasoning tags vary by model: <think>/<thinking> (and their closers).
const THINK_OPEN = /<think(?:ing)?>/;
const THINK_CLOSE = /<\/think(?:ing)?>/;

// Split inline reasoning out of streamed content. Handles three shapes:
// - no tags → all answer text
// - "<think>…"   (open, not yet closed) → everything after the tag is reasoning
// - "…</think>…" (closed, with or without a leading open tag) → before the closer is
//   reasoning, after is the answer. (This vLLM emits a bare closing </think>.)
function splitThink(raw: string): { reasoning: string; text: string } {
  const closeM = raw.match(THINK_CLOSE);
  const openM = raw.match(THINK_OPEN);
  const close = closeM ? closeM.index! : -1;
  const open = openM ? openM.index! : -1;
  if (close === -1 && open === -1) return { reasoning: "", text: raw };
  if (close === -1) return { reasoning: raw.slice(open + openM![0].length), text: raw.slice(0, open) };
  const pre = open === -1 ? "" : raw.slice(0, open);
  const start = open === -1 ? 0 : open + openM![0].length;
  return { reasoning: raw.slice(start, close), text: pre + raw.slice(close + closeM![0].length) };
}

function toOpenAIMessages(messages: readonly ThreadMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(""),
  }));
}

const adapter: ChatModelAdapter = {
  async *run({ messages, abortSignal, context }) {
    const s = loadSettings();
    // ponytail: no tools are registered in this app yet — tool-calling is wired but
    // dormant. context.tools fills in once a tool is registered (useAssistantTool /
    // makeAssistantTool); then enabling the toggle sends them. Until then this is [].
    const toolEntries = Object.entries(context.tools ?? {});
    const useTools = s.toolsEnabled && toolEntries.length > 0;
    const openaiTools = toolEntries.map(([name, t]) => ({
      type: "function" as const,
      function: { name, description: t.description, parameters: t.parameters },
    }));

    const tStart = performance.now();
    let res: Response;
    try {
      res = await fetch(chatEndpoint(s.baseURL), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: s.model,
          messages: [
            ...(s.systemPrompt.trim() ? [{ role: "system", content: s.systemPrompt }] : []),
            ...toOpenAIMessages(messages),
          ],
          stream: true,
          stream_options: { include_usage: true },
          ...(useTools ? { tools: openaiTools } : {}),
          // vLLM/Qwen-style switch: skip the <think> phase to save time + tokens
          ...(s.disableThinking ? { chat_template_kwargs: { enable_thinking: false } } : {}),
          ...(s.temperature !== "" ? { temperature: Number(s.temperature) } : {}),
          ...(s.maxTokens !== "" ? { max_tokens: Number(s.maxTokens) } : {}),
        }),
        signal: abortSignal,
      });
    } catch (e) {
      // fetch throws on network failure / CORS block (no response at all)
      throw new Error(
        `無法連線到端點。請確認 baseURL 正確、伺服器在線，且該端點已開啟 CORS。\n(${(e as Error).message})`,
      );
    }

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`端點回傳 ${res.status}：${body.slice(0, 500) || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let rawContent = ""; // accumulated delta.content (may contain <think> tags)
    let reasoningField = ""; // accumulated delta.reasoning_content (proper field)
    let tFirst = 0; // time of first token
    let usage: { prompt_tokens?: number; completion_tokens?: number } | null = null;
    // ponytail: tool_calls are accumulated and streamed so tool-ui can render them,
    // but the result is NOT executed and sent back (no multi-turn tool round-trip).
    // Target vLLM can't do tool calling anyway. Upgrade path: register tools with
    // execute fns + loop the adapter on tool results when an endpoint supports it.
    const toolCalls = new Map<string, { type: "tool-call"; toolName: string; toolCallId: string; args: unknown }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        let chunk: any;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue; // tolerate keep-alive / non-JSON lines
        }
        if (chunk.usage) usage = chunk.usage; // final usage chunk (choices empty)
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (!tFirst && (delta.content || delta.reasoning_content)) tFirst = performance.now();
        rawContent += delta.content ?? "";
        // reasoning field name varies by vLLM build: some emit `reasoning_content`,
        // others a bare `reasoning`. Accept either so the CoT lands in the reasoning
        // block (and, being non-empty, stops the live heuristic below from mislabelling
        // the answer content as reasoning).
        reasoningField += delta.reasoning_content ?? delta.reasoning ?? "";
        for (const tc of delta.tool_calls ?? []) {
          const id = tc.id ?? `tc_${tc.index}`;
          const prev = toolCalls.get(id);
          toolCalls.set(id, {
            type: "tool-call",
            toolCallId: id,
            toolName: tc.function?.name ?? prev?.toolName ?? "",
            args: tc.function?.arguments ?? (prev?.args ?? ""),
          });
        }
        const parsed = splitThink(rawContent);
        let reasoning = reasoningField + parsed.reasoning;
        let text = parsed.text;
        // Live UX: this model streams its reasoning then ends it with a *bare*
        // </think> (no opening tag). Until that closer arrives we can't tell
        // reasoning from answer, so it would flash as answer text then collapse.
        // ponytail: while thinking is on and no tag has appeared yet, treat the
        // stream as reasoning so it flows into the collapsible block live. Assumes
        // a reasoning reply eventually emits </think>; a tagless direct answer
        // would render as reasoning (rare, recoverable). Proper fix is server-side
        // vLLM --reasoning-parser, which emits reasoning_content (handled above).
        if (
          !s.disableThinking &&
          !reasoningField &&
          rawContent &&
          !THINK_OPEN.test(rawContent) &&
          !THINK_CLOSE.test(rawContent)
        ) {
          reasoning = rawContent;
          text = "";
        }
        yield {
          content: [
            ...(reasoning ? [{ type: "reasoning" as const, text: reasoning }] : []),
            ...(text ? [{ type: "text" as const, text }] : []),
            ...Array.from(toolCalls.values()).map((t) => ({
              type: "tool-call" as const,
              toolCallId: t.toolCallId,
              toolName: t.toolName,
              args: {},
              argsText: typeof t.args === "string" ? t.args : JSON.stringify(t.args),
            })),
          ],
        };
      }
    }

    // publish speed stats for this run (kept out of message content)
    const tEnd = performance.now();
    if (tFirst) {
      const completion = usage?.completion_tokens;
      const estimated = completion == null;
      setStats({
        ttftMs: tFirst - tStart,
        genMs: tEnd - tFirst,
        promptTokens: usage?.prompt_tokens,
        completionTokens: completion ?? Math.round(rawContent.length / 4),
        estimated,
      });
    }
  },
};

export function RuntimeProvider({
  conversationId,
  onTitle,
  children,
}: {
  conversationId: string;
  onTitle?: () => void;
  children: ReactNode;
}) {
  const runtime = useLocalRuntime(adapter, {
    adapters: { history: makeHistoryAdapter(conversationId, onTitle) },
  });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
