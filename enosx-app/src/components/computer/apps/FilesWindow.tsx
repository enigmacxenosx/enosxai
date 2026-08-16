import { useState } from "react";
import { File, FileUp, FolderOpen, ShieldCheck, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function FilesWindow() {
  const { config } = useTheme();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white/80">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition hover:bg-white/5" style={{ borderColor: `rgba(${config.accentRgb},0.3)`, background: `rgba(${config.accentRgb},0.04)` }}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: config.accent, background: `rgba(${config.accentRgb},0.13)` }}><FileUp size={19} /></span>
        <span className="text-xs font-semibold text-white/75">Select files for context</span>
        <span className="text-[10px] text-white/35">Nothing is read until you choose it.</span>
        <input type="file" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
      </label>

      <div className="min-h-0 flex-1 overflow-auto">
        {files.length ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Selected files · {files.length}</p>
            {files.map((file) => (
              <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/15 px-3 py-2.5">
                <File size={15} className="flex-shrink-0 text-amber-300" />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs text-white/75">{file.name}</span><span className="block text-[10px] text-white/30">{Math.max(1, Math.round(file.size / 1024))} KB</span></span>
                <button type="button" aria-label={`Remove ${file.name}`} title="Remove file" onClick={() => setFiles((current) => current.filter((entry) => entry !== file))} className="rounded-md p-1 text-white/35 hover:bg-white/10 hover:text-white"><X size={13} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-white/30"><FolderOpen size={24} /><p className="text-xs">No files selected.</p></div>
        )}
      </div>

      <div className="flex gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-[10px] leading-relaxed text-emerald-100/65"><ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-emerald-300" /><span>File access is user-initiated and scoped to the files shown above. Unrestricted filesystem browsing remains outside the web workspace.</span></div>
    </div>
  );
}
