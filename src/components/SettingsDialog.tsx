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
