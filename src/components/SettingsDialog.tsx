import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { loadSettings, saveSettings, type Settings } from "@/lib/storage";

export function SettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [s, setS] = useState<Settings>(loadSettings);

  // re-sync from storage whenever the dialog opens
  function handleOpenChange(next: boolean) {
    if (next) setS(loadSettings());
    onOpenChange(next);
  }

  function save() {
    saveSettings({ ...s, baseURL: s.baseURL.trim(), apiKey: s.apiKey.trim(), model: s.model.trim() });
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>連線設定</DialogTitle>
          <DialogDescription>
            自帶 OpenAI 相容端點。設定只存在這個瀏覽器（localStorage）。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="baseURL">Base URL</Label>
            <Input
              id="baseURL"
              placeholder="https://your-host  或  https://your-host/v1"
              value={s.baseURL}
              onChange={(e) => setS({ ...s, baseURL: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={s.apiKey}
              onChange={(e) => setS({ ...s, apiKey: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="例如 nemotron3-super"
              value={s.model}
              onChange={(e) => setS({ ...s, model: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="systemPrompt">預設 system prompt</Label>
            <textarea
              id="systemPrompt"
              rows={4}
              placeholder="角色設定／習慣／立場（留空則不送）。例：You are based in Taiwan, use traditional Chinese terms (台灣/中華民國), do not use PRC framing."
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              value={s.systemPrompt}
              onChange={(e) => setS({ ...s, systemPrompt: e.target.value })}
            />
            <p className="text-muted-foreground text-xs">
              每次請求前以 system 訊息注入。推論模型的 &lt;think&gt; 仍可能受語料影響，可搭配「停用思考」更穩。
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="nothink">停用思考（reasoning）</Label>
              <p className="text-muted-foreground text-xs">
                送 enable_thinking:false，跳過 &lt;think&gt; 省時間與 token。
              </p>
            </div>
            <Switch
              id="nothink"
              checked={s.disableThinking}
              onCheckedChange={(v) => setS({ ...s, disableThinking: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                placeholder="留空 = 預設"
                value={s.temperature}
                onChange={(e) => setS({ ...s, temperature: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="maxTokens">Max tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                step="1"
                min="1"
                placeholder="留空 = 預設"
                value={s.maxTokens}
                onChange={(e) => setS({ ...s, maxTokens: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="stats">顯示測速</Label>
              <p className="text-muted-foreground text-xs">
                右上角顯示 TTFT 與輸入/輸出速度。
              </p>
            </div>
            <Switch
              id="stats"
              checked={s.showStats}
              onCheckedChange={(v) => setS({ ...s, showStats: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="tools">啟用工具呼叫</Label>
              <p className="text-muted-foreground text-xs">
                需端點支援（vLLM 須開 --enable-auto-tool-choice）。
              </p>
            </div>
            <Switch
              id="tools"
              checked={s.toolsEnabled}
              onCheckedChange={(v) => setS({ ...s, toolsEnabled: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!s.baseURL.trim() || !s.model.trim()}>
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
