import { useState } from "react";
import { Check, Cpu, Loader2, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import {
  DEFAULT_LOCAL_MODEL_SETTINGS,
  isDesktopShell,
  listLocalModels,
  readLocalModelSettings,
  saveLocalModelSettings,
} from "@/lib/localModels";

type Props = { accentColor: string; accentRgb: string };

export default function LocalModelsPanel({ accentColor, accentRgb }: Props) {
  const initial = readLocalModelSettings();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || DEFAULT_LOCAL_MODEL_SETTINGS.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  const [enabled, setEnabled] = useState(initial.enabled);
  const desktop = isDesktopShell();

  const refreshModels = async () => {
    setChecking(true);
    setStatus("");
    try {
      const installed = await listLocalModels(baseUrl.trim());
      setModels(installed);
      if (!model && installed.length) setModel(installed[0]);
      setStatus(installed.length ? `Found ${installed.length} installed model${installed.length === 1 ? "" : "s"}.` : "Ollama is running, but no models are installed yet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not connect to Ollama.");
    } finally {
      setChecking(false);
    }
  };

  const saveSettings = (nextEnabled: boolean) => {
    const next = { enabled: nextEnabled, baseUrl: baseUrl.trim(), model: model.trim() };
    saveLocalModelSettings(next);
    setEnabled(nextEnabled);
    setStatus(nextEnabled ? `Local chat enabled with ${next.model}. Messages are sent only to Ollama on this device.` : "Local chat disabled. ENOSX will use its normal online chat service.");
  };

  const inputStyle = {
    width: "100%",
    borderRadius: 10,
    padding: "10px 12px",
    color: "rgba(255,255,255,0.9)",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    outline: "none",
  } as const;

  return (
    <div className="neon-settings-view px-5 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.14)` }}>
          <Cpu size={19} style={{ color: accentColor }} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Offline models</div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.42)" }}>Run chat on your own device with Ollama</div>
        </div>
      </div>

      <div className="rounded-xl p-3 flex gap-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {desktop ? <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: "#4ade80" }} /> : <WifiOff size={16} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />}
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
          {desktop
            ? "When enabled, chat goes directly to Ollama on this computer; ENOSX does not fall back to cloud chat. Your installed model stays on your device."
            : "Local-model chat is available in the ENOSX desktop release. This web app cannot safely reach a local Ollama server."}
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.48)" }}>OLLAMA ADDRESS</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} disabled={!desktop || enabled} spellCheck={false} style={inputStyle} placeholder="http://127.0.0.1:11434" />
        </label>
        <button type="button" onClick={refreshModels} disabled={!desktop || checking || enabled} className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-45" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.24)`, color: accentColor }}>
          {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {checking ? "Checking Ollama…" : "Find installed models"}
        </button>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.48)" }}>MODEL NAME</span>
          <input list="enosx-local-model-options" value={model} onChange={(event) => setModel(event.target.value)} disabled={!desktop || enabled} style={inputStyle} placeholder="For example, qwen3:4b" />
          <datalist id="enosx-local-model-options">{models.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
        {models.length > 0 && <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Installed: {models.join(", ")}</div>}
      </div>

      {status && <p role="status" className="text-xs leading-relaxed" style={{ color: status.includes("Could not") || status.includes("no models") ? "#fbbf24" : "rgba(255,255,255,0.68)" }}>{status}</p>}

      {enabled ? (
        <button type="button" onClick={() => saveSettings(false)} className="w-full py-3 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.76)" }}>
          Disable local chat
        </button>
      ) : (
        <button type="button" onClick={() => saveSettings(true)} disabled={!desktop || !model.trim() || !baseUrl.trim()} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.38)`, color: accentColor }}>
          <Check size={14} /> Use this offline model
        </button>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.36)" }}>
        Install Ollama separately, then download a model once (for example <code>ollama pull qwen3:4b</code>). After the model is installed, chat works without an internet connection. Model files are not bundled with the ENOSX installer.
      </p>
    </div>
  );
}
