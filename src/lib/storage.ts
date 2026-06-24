import {
  ExportedMessageRepository,
  type ThreadHistoryAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";

// ── Connection settings (BYOK) ──────────────────────────────────────────
// ponytail: API key lives in localStorage in plaintext. Intentional — this is a
// BYOK, no-backend, single-user tool (same as every other BYOK chat). XSS could
// read it; we mitigate by not loading third-party scripts. Upgrade path if ever
// needed: WebCrypto-encrypt with a user passphrase. Not now (YAGNI).
// A named system-prompt preset. The active one (if any) is injected as a system
// message at the front of every request. Content is user-set, never hardcoded.
export type SystemPrompt = { id: string; name: string; content: string };

export type Settings = {
  baseURL: string;
  apiKey: string;
  model: string;
  toolsEnabled: boolean;
  disableThinking: boolean;
  systemPrompts: SystemPrompt[];
  activeSystemPromptId: string | null; // null = none active → no system message
  // kept as strings (what the input holds); parsed at request time, empty = omit
  temperature: string;
  maxTokens: string;
  showStats: boolean;
};

const SETTINGS_KEY = "chat:settings";

const DEFAULTS: Settings = {
  baseURL: "",
  apiKey: "",
  model: "",
  toolsEnabled: false,
  disableThinking: false,
  systemPrompts: [],
  activeSystemPromptId: null,
  temperature: "",
  maxTokens: "",
  showStats: true,
};

export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    let systemPrompts: SystemPrompt[] = Array.isArray(s.systemPrompts) ? s.systemPrompts : [];
    let activeSystemPromptId: string | null = s.activeSystemPromptId ?? null;
    // migrate the legacy single `systemPrompt` string into one preset (stable id so
    // it doesn't churn across loads before the user next saves).
    if (!systemPrompts.length && s.systemPrompt) {
      systemPrompts = [{ id: "legacy", name: "預設", content: s.systemPrompt }];
      activeSystemPromptId = "legacy";
    }
    return {
      ...DEFAULTS,
      baseURL: s.baseURL || "",
      apiKey: s.apiKey || "",
      model: s.model || "",
      toolsEnabled: !!s.toolsEnabled,
      disableThinking: !!s.disableThinking,
      systemPrompts,
      activeSystemPromptId,
      temperature: s.temperature ?? "",
      maxTokens: s.maxTokens ?? "",
      showStats: s.showStats ?? true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

// Resolve the active preset's content, or "" if none active / empty.
export function activeSystemPrompt(s: Settings): string {
  const p = s.systemPrompts.find((x) => x.id === s.activeSystemPromptId);
  return p?.content ?? "";
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function isConfigured(s: Settings): boolean {
  return !!s.baseURL && !!s.model;
}

// ── Conversations ───────────────────────────────────────────────────────
export type Conversation = { id: string; title: string };

const INDEX_KEY = "chat:conversations";
const msgsKey = (id: string) => `chat:msgs:${id}`;

export function listConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveIndex(list: Conversation[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export function createConversation(): string {
  const id = crypto.randomUUID();
  saveIndex([{ id, title: "新對話" }, ...listConversations()]);
  return id;
}

export function deleteConversation(id: string) {
  saveIndex(listConversations().filter((c) => c.id !== id));
  localStorage.removeItem(msgsKey(id));
}

function setTitleIfDefault(id: string, title: string) {
  const list = listConversations();
  const c = list.find((x) => x.id === id);
  if (c && c.title === "新對話") {
    c.title = title.slice(0, 40);
    saveIndex(list);
  }
}

// ── Per-conversation history adapter (localStorage-backed) ───────────────
// ponytail: persists a flat message list, not the branch tree. Reload linearises
// via fromArray, so branch/edit history is lost across reloads — fine for a local
// single-user chat. Upgrade path: store headId + parentId graph if branching must
// survive reloads.
export function makeHistoryAdapter(
  conversationId: string,
  onTitle?: () => void,
): ThreadHistoryAdapter {
  const key = msgsKey(conversationId);
  const read = (): ThreadMessageLike[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };
  return {
    async load() {
      return ExportedMessageRepository.fromArray(read());
    },
    async append(item) {
      const msgs = read();
      msgs.push(item.message as unknown as ThreadMessageLike);
      localStorage.setItem(key, JSON.stringify(msgs));
      if (item.message.role === "user") {
        const text = item.message.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("");
        if (text) {
          setTitleIfDefault(conversationId, text);
          onTitle?.();
        }
      }
    },
  };
}
