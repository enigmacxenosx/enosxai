import { FormEvent, useState } from "react";
import { ExternalLink, FileText, Link2, Loader2, Search, ShieldCheck } from "lucide-react";
import { useBrowser } from "@/hooks/useBrowser";
import { useTheme } from "@/contexts/ThemeContext";

export function BrowserWindow() {
  const { config } = useTheme();
  const { isLoading, error, lastContent, lastLinks, readWebpage, extractLinks } = useBrowser();
  const [url, setUrl] = useState("https://example.com");
  const [status, setStatus] = useState<string | null>(null);

  const normalizeUrl = (value: string) => /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const handleRead = async (event: FormEvent) => {
    event.preventDefault();
    const target = normalizeUrl(url.trim());
    if (!target) return;
    setStatus("Reading webpage...");
    const result = await readWebpage(target);
    setStatus(result ? "Read-only result received." : null);
  };
  const handleLinks = async () => {
    const target = normalizeUrl(url.trim());
    setStatus("Extracting links...");
    const result = await extractLinks(target);
    setStatus(result ? `${result.length} links found.` : null);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-white/80">
      <form onSubmit={handleRead} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} aria-label="Webpage URL" className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-xs text-white outline-none transition focus:border-violet-300/50" placeholder="https://example.com" />
        </div>
        <button type="submit" disabled={isLoading} className="rounded-lg px-3 text-xs font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50" style={{ background: config.accent }}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Read"}
        </button>
      </form>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-300/15 bg-violet-300/5 px-3 py-2 text-[10px] text-violet-100/65">
        <span className="flex items-center gap-2"><ShieldCheck size={13} className="text-violet-300" /> Read-only browser tools are available here.</span>
        <button type="button" onClick={handleLinks} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-white/60 hover:bg-white/10 disabled:opacity-50"><Link2 size={12} /> Links</button>
      </div>

      {status && <p className="text-[10px] text-white/45">{status}</p>}
      {error && <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-[11px] text-rose-100/75">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/8 bg-black/15 p-3">
        {lastContent ? (
          <article className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-semibold text-white/90">{lastContent.title || "Untitled webpage"}</p><p className="mt-1 break-all text-[10px] text-white/35">{lastContent.url}</p></div>
              <a href={lastContent.url} target="_blank" rel="noreferrer" aria-label="Open webpage in a new tab" title="Open in new tab" className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"><ExternalLink size={14} /></a>
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/65">{lastContent.text || "No readable text was returned."}</p>
          </article>
        ) : lastLinks ? (
          <div className="space-y-2"><p className="text-xs font-semibold text-white/75">Extracted links</p>{lastLinks.map((link, index) => <a key={`${link.href}-${index}`} href={link.href} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-lg border border-white/6 px-2 py-2 text-[10px] text-white/60 hover:bg-white/5"><Link2 size={12} className="mt-0.5 flex-shrink-0 text-violet-300" /><span className="min-w-0"><span className="block truncate text-white/75">{link.text || "Untitled link"}</span><span className="block truncate text-white/30">{link.href}</span></span></a>)}</div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-white/30"><FileText size={24} /><p className="text-xs">Read a public webpage to view its text here.</p></div>
        )}
      </div>
      <p className="text-[10px] leading-relaxed text-white/30">Clicks and form fills are not exposed as silent actions. Any modifying browser action remains review-gated by the existing action system.</p>
    </div>
  );
}
