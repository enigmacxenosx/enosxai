/*
 * ENOSX AI — VoiceSettingsPanel
 * Speech speed/pitch controls, continuous voice conversation, and wake-phrase
 * detection. Settings persist in localStorage and are read live by the voice
 * hook, so they apply immediately without a restart.
 */

import { Volume2, Waves, Mic, Zap } from "lucide-react";
import { SpeechSettings } from "@/hooks/useVoice";
import { Switch } from "@/components/Switch";

interface VoiceSettingsPanelProps {
  settings: SpeechSettings;
  onUpdate: (patch: Partial<SpeechSettings>) => void;
}

function SliderRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-white/60 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/70">{label}</span>
          <span className="text-[11px] text-white/40 tabular-nums">{display}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-white/80 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
    </div>
  );
}

export default function VoiceSettingsPanel({ settings, onUpdate }: VoiceSettingsPanelProps) {
  return (
    <div className="flex flex-col">
      <SliderRow
        icon={<Volume2 size={14} />}
        label="Speech speed"
        value={settings.rate}
        min={0.5}
        max={2}
        step={0.1}
        display={settings.rate.toFixed(1)}
        onChange={(rate) => onUpdate({ rate })}
      />
      <SliderRow
        icon={<Waves size={14} />}
        label="Voice pitch"
        value={settings.pitch}
        min={0}
        max={2}
        step={0.1}
        display={settings.pitch.toFixed(1)}
        onChange={(pitch) => onUpdate({ pitch })}
      />
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-white/60 shrink-0">
          <Mic size={14} />
        </span>
        <div className="flex-1">
          <p className="text-xs text-white/70">Continuous conversation</p>
          <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">
            After the assistant speaks, it automatically starts listening again.
          </p>
        </div>
        <Switch checked={settings.continuousConversation} onChange={(value) => onUpdate({ continuousConversation: value })} />
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-white/60 shrink-0">
          <Zap size={14} />
        </span>
        <div className="flex-1">
          <p className="text-xs text-white/70">Wake phrase</p>
          <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">
            Say “Enosx” while listening to skip the wake prompt and go straight to your request.
          </p>
        </div>
        <Switch checked={settings.wakePhrase} onChange={(value) => onUpdate({ wakePhrase: value })} />
      </div>
    </div>
  );
}
