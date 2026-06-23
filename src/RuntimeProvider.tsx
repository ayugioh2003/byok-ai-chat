import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { loadSettings, makeHistoryAdapter } from "@/lib/storage";

// baseURL may be "https://host", "https://host/", or "https://host/v1".
// Normalise to the chat-completions endpoint.
function chatEndpoint(baseURL: string): string {
  const b = baseURL.replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(b)) return b;
  if (/\/v1$/.test(b)) return b + "/chat/completions";
  return b + "/v1/chat/completions";
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
          messages: toOpenAIMessages(messages),
          stream: true,
          ...(useTools ? { tools: openaiTools } : {}),
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
    let text = "";
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
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        text += delta.content ?? "";
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
        yield {
          content: [
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
