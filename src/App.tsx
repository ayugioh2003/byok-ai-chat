import { useEffect, useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StatsBar } from "@/components/StatsBar";
import { RuntimeProvider } from "@/RuntimeProvider";
import {
  createConversation,
  deleteConversation,
  isConfigured,
  listConversations,
  loadSettings,
} from "@/lib/storage";

export default function App() {
  const [conversations, setConversations] = useState(listConversations);
  const [activeId, setActiveId] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [configured, setConfigured] = useState(() => isConfigured(loadSettings()));

  // ensure at least one conversation exists, and pick an active one
  useEffect(() => {
    let list = listConversations();
    if (list.length === 0) {
      createConversation();
      list = listConversations();
    }
    setConversations(list);
    setActiveId(list[0].id);
  }, []);

  function refresh() {
    setConversations(listConversations());
  }

  function newConversation() {
    const id = createConversation();
    refresh();
    setActiveId(id);
  }

  function remove(id: string) {
    deleteConversation(id);
    const list = listConversations();
    setConversations(list);
    if (id === activeId) {
      if (list.length === 0) newConversation();
      else setActiveId(list[0].id);
    }
  }

  return (
    <div className="flex h-dvh">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-muted/30">
        <div className="flex items-center gap-2 p-3">
          <Button className="flex-1" size="sm" onClick={newConversation}>
            + 新對話
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            設定
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
                c.id === activeId ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <button
                className="flex-1 truncate text-left"
                onClick={() => setActiveId(c.id)}
              >
                {c.title}
              </button>
              <button
                className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                onClick={() => remove(c.id)}
                aria-label="刪除對話"
              >
                ✕
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {!configured ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">尚未設定連線。</p>
            <Button onClick={() => setSettingsOpen(true)}>前往設定</Button>
          </div>
        ) : activeId ? (
          <RuntimeProvider key={activeId} conversationId={activeId} onTitle={refresh}>
            <Thread />
          </RuntimeProvider>
        ) : null}
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => setConfigured(isConfigured(loadSettings()))}
      />
      <StatsBar />
    </div>
  );
}
