import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, BookOpen, Check, CloudOff, Command, Download, FileUp, Fingerprint, Plus, Search, Shield, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { GlobalLayout } from "@/components/GlobalLayout";
import { useKnowledgeBank, readKnowledgeFile, KnowledgeKind, VECTOR_DIMENSIONS } from "@/hooks/useKnowledgeBank";

const kindOptions: KnowledgeKind[] = ["fact", "instruction", "document", "skill", "project"];

export default function KnowledgeBankPage() {
  const [, navigate] = useLocation();
  const { entries, addEntry, removeEntry, clearAll, importEntries, exportEntries, search, rebuildIndex, stats } = useKnowledgeBank();
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLog, setTerminalLog] = useState<string[]>(["ENOSX GOD MODE // KNOWLEDGE CONSOLE", "Type `help` to list commands."]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<KnowledgeKind>("fact");
  const [tags, setTags] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const visibleEntries = useMemo(() => search(query), [query, search]);

  const saveEntry = (): void => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and knowledge content are required");
      return;
    }
    addEntry({ title: title.trim(), content: content.trim(), kind, source: "Manual GOD MODE entry", tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
    setTitle(""); setContent(""); setTags(""); setShowComposer(false); toast.success("Knowledge committed to local brain");
  };

  const uploadFile = async (file: File) => {
    const data = await readKnowledgeFile(file);
    addEntry(data);
    toast.success(`${file.name} indexed locally`);
  };

  const download = () => {
    const blob = new Blob([exportEntries()], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "enosx-knowledge-bank.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  const runCommand = () => {
    const command = terminalInput.trim(); if (!command) return;
    const [verb, ...args] = command.split(" "); const normalizedCommand = command.toLowerCase(); let response = "";
    if (verb === "help") response = "Commands: push <title> :: <content> | vector stats | vector reindex | import <file via UI> | export | stats | clear | search <term> | lock";
    else if (verb === "push") {
      const payload = args.join(" ");
      const [entryTitle, entryContent] = payload.split("::").map((part) => part?.trim());
      if (!entryTitle || !entryContent) response = "Usage: push <title> :: <knowledge content>";
      else { addEntry({ title: entryTitle, content: entryContent, kind: "fact", source: "GOD MODE terminal", tags: ["terminal"] }); response = `Pushed '${entryTitle}' into the local brain.`; }
    }
    else if (normalizedCommand === "vector stats") response = `Vector index: ${stats.indexed}/${stats.total} entries // ${VECTOR_DIMENSIONS} dimensions // local cosine retrieval`;
    else if (normalizedCommand === "vector reindex") { rebuildIndex(); response = `Rebuilt local vector index for ${stats.total} entries.`; }
    else if (verb === "stats") response = `${stats.total} entries // ${stats.words} words // ${stats.kinds} knowledge types // ${stats.indexed} vector indexed`;
    else if (verb === "export") { download(); response = "Exported encrypted-ready JSON snapshot to your device."; }
    else if (verb === "search") response = search(args.join(" ")).map((entry) => `• ${entry.title}`).join("\n") || "No matching memory found.";
    else if (verb === "clear") { clearAll(); response = "Local knowledge bank cleared."; }
    else if (verb === "lock") { setShowTerminal(false); response = "GOD MODE console locked."; }
    else response = "Unknown command. Type `help`.";
    setTerminalLog((current) => [...current, `> ${command}`, response]); setTerminalInput("");
  };

  return <GlobalLayout><div className="h-full overflow-auto bg-[#07090d]/80 text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090b10]/90 px-5 py-4 backdrop-blur-xl md:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3"><button onClick={() => navigate("/")} className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/10"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-bold tracking-[0.28em] text-cyan-300">ENOSX AI / CORE MEMORY</p><h1 className="text-xl font-semibold tracking-tight">Knowledge Bank</h1></div></div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300 sm:flex"><CloudOff size={14}/> Offline-first</span><button onClick={() => setShowTerminal(true)} className="flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-400/20"><Command size={15}/> GOD MODE</button></div>
      </div>
    </header>
    <main className="mx-auto grid max-w-7xl gap-6 p-5 md:p-10 lg:grid-cols-[1fr_330px]">
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-semibold">Your private brain.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Store facts, instructions, skills, and project context on this device. The bank remains useful without an API key; optional models can be connected later for richer answers.</p></div><div className="flex gap-2"><button onClick={() => jsonRef.current?.click()} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10"><Upload size={14} className="mr-2 inline"/>Import JSON</button><button onClick={download} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10"><Download size={14} className="mr-2 inline"/>Export</button><input ref={jsonRef} type="file" accept="application/json" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const count = importEntries(JSON.parse(await file.text())); toast.success(`${count} entries imported`); } catch { toast.error("Invalid knowledge JSON"); } event.target.value = ""; }}/></div></div>
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><Search size={17} className="text-white/40"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your local brain..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"/><span className="text-xs text-white/30">{visibleEntries.length} results</span></div>
        <div className="space-y-3">{visibleEntries.map((entry) => <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/30"><div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-200">{entry.kind}</span>{entry.tags.map((tag) => <span key={tag} className="text-[10px] text-white/35">#{tag}</span>)}</div><h3 className="font-medium">{entry.title}</h3></div><button onClick={() => removeEntry(entry.id)} className="text-white/25 hover:text-red-300"><Trash2 size={16}/></button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/60">{entry.content}</p><p className="mt-4 text-[10px] uppercase tracking-wider text-white/25">Source: {entry.source} · Updated {new Date(entry.updatedAt).toLocaleString()}</p></article>)}{!visibleEntries.length && <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center"><Fingerprint className="mx-auto mb-3 text-cyan-300/50" size={32}/><p className="text-sm text-white/55">Your brain is empty.</p><p className="mt-1 text-xs text-white/30">Add a fact, upload a document, or use GOD MODE.</p></div>}</div>
      </section>
      <aside className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="mb-4 flex items-center gap-3"><BookOpen className="text-cyan-300" size={20}/><div><p className="font-medium">Brain health</p><p className="text-xs text-white/40">Stored on this device</p></div></div><div className="grid grid-cols-4 gap-2 text-center"><div><p className="text-xl font-semibold text-cyan-200">{stats.total}</p>
<p className="text-[10px] uppercase text-white/35">entries</p></div><div><p className="text-xl font-semibold text-fuchsia-200">{stats.words}</p><p className="text-[10px] uppercase text-white/35">words</p></div><div><p className="text-xl font-semibold text-emerald-200">{stats.kinds}</p><p className="text-[10px] uppercase text-white/35">types</p></div><div><p className="text-xl font-semibold text-amber-200">{stats.indexed}</p><p className="text-[10px] uppercase text-white/35">vectors</p></div></div></div><button onClick={() => setShowComposer(true)}
 className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-200"><Plus size={17} className="mr-2 inline"/> Add knowledge</button><button onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:bg-white/10"><FileUp size={17} className="mr-2 inline"/> Upload document</button><input ref={fileRef} type="file" accept=".txt,.md,.json,.csv,.log" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file); e.target.value = ""; }}/><div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-xs leading-5 text-amber-100/60"><Shield size={15} className="mb-2 text-amber-300"/><p><strong className="text-amber-200">Local control:</strong> entries are stored in browser storage on this device. Export regular snapshots before clearing site data.</p></div></aside>
    </main>
    {showComposer && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#11151d] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] tracking-[0.25em] text-cyan-300">GOD MODE WRITE ACCESS</p><h2 className="mt-1 text-xl font-semibold">Commit knowledge</h2></div><button onClick={() => setShowComposer(false)}><X className="text-white/50"/></button></div><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none"/><div className="mb-3 grid grid-cols-2 gap-3"><select value={kind} onChange={(e) => setKind(e.target.value as KnowledgeKind)} className="rounded-xl border border-white/10 bg-[#171c25] p-3 text-sm outline-none">{kindOptions.map((option) => <option key={option}>{option}</option>)}</select><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma separated" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none"/></div><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the durable knowledge ENOSX should remember..." rows={8} className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 outline-none"/><button onClick={saveEntry} className="mt-4 w-full rounded-xl bg-cyan-300 py-3 text-sm font-semibold text-black"><Check size={16} className="mr-2 inline"/>Commit to local brain</button></div></div>}
    {showTerminal && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center"><div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-fuchsia-300/30 bg-[#090b10] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="text-xs font-bold tracking-[0.2em] text-fuchsia-200">GOD MODE TERMINAL // LOCAL ONLY</span><button onClick={() => setShowTerminal(false)}><X size={16} className="text-white/40"/></button></div><div className="h-72 overflow-auto p-4 font-mono text-xs leading-6 text-emerald-300">{terminalLog.map((line, i) => <div key={i} className={line.startsWith(">") ? "text-fuchsia-200" : ""}>{line || " "}</div>)}</div><div className="flex items-center gap-2 border-t border-white/10 p-3"><span className="font-mono text-fuchsia-300">›</span><input autoFocus value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runCommand()} placeholder="help" className="flex-1 bg-transparent font-mono text-sm outline-none"/><button onClick={runCommand} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-semibold text-black">Run</button></div></div></div>}
  </div></GlobalLayout>;
}
