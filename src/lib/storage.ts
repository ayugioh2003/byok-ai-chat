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
export type Settings = {
  baseURL: string;
  apiKey: string;
  model: string;
  toolsEnabled: boolean;
  disableThinking: boolean;
  // kept as strings (what the input holds); parsed at request time, empty = omit
  temperature: string;
  maxTokens: string;
  showStats: boolean;
};

const SETTINGS_KEY = "chat:settings";

export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      baseURL: s.baseURL || "",
      apiKey: s.apiKey || "",
      model: s.model || "",
      toolsEnabled: !!s.toolsEnabled,
      disableThinking: !!s.disableThinking,
      temperature: s.temperature ?? "",
      maxTokens: s.maxTokens ?? "",
      showStats: s.showStats ?? true,
    };
  } catch {
    return {
      baseURL: "",
      apiKey: "",
      model: "",
      toolsEnabled: false,
      disableThinking: false,
      temperature: "",
      maxTokens: "",
      showStats: true,
    };
  }
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
