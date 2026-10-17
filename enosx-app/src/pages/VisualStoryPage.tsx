import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Gauge,
  LineChart as LineChartIcon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

 type StoryDatum = { label: string; value: number };
 type ChartMode = "area" | "bar" | "line";

 const SAMPLE_DATA: StoryDatum[] = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 58 },
  { label: "Mar", value: 51 },
  { label: "Apr", value: 76 },
  { label: "May", value: 89 },
  { label: "Jun", value: 112 },
  { label: "Jul", value: 128 },
 ];

 const STORY_BEATS = [
  { eyebrow: "01 / THE SIGNAL", title: "A quiet beginning", description: "The first movement is small, but the direction is already visible. Establish the baseline before the momentum arrives.", focus: 1 },
  { eyebrow: "02 / THE TURN", title: "Momentum changes the shape", description: "A brief dip gives way to a stronger climb. This is where the pattern stops being noise and starts becoming a story.", focus: 4 },
  { eyebrow: "03 / THE PROOF", title: "The signal compounds", description: "The final stretch carries the narrative: focused effort turns into measurable lift, with 3× the opening value.", focus: 6 },
 ];

 function parseCsv(input: string): StoryDatum[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((line) => line.split(","))
    .map(([label, rawValue]) => ({ label: (label || "Point").trim().slice(0, 18), value: Number(rawValue) }))
    .filter((item) => item.label && Number.isFinite(item.value));
 }

 const csvFor = (data: StoryDatum[]) => data.map(({ label, value }) => `${label},${value}`).join("\n");

 function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
 }

 export default function VisualStoryPage() {
  const [data, setData] = useState<StoryDatum[]>(SAMPLE_DATA);
  const [csv, setCsv] = useState(csvFor(SAMPLE_DATA));
  const [chartMode, setChartMode] = useState<ChartMode>("area");
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showData, setShowData] = useState(false);

  const activeStory = STORY_BEATS[beat];
  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const change = first ? Math.round(((last - first) / first) * 100) : 0;
  const focusedLabel = data[Math.min(activeStory.focus, Math.max(data.length - 1, 0))]?.label;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setBeat((current) => (current + 1) % STORY_BEATS.length), 4200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const chartData = useMemo(() => data.map((item, index) => ({ ...item, active: index <= activeStory.focus })), [data, activeStory.focus]);

  const applyCsv = () => {
    const next = parseCsv(csv);
    if (next.length >= 2) {
      setData(next);
      setBeat(0);
      setPlaying(false);
    }
  };

  const goToBeat = (nextBeat: number) => setBeat((nextBeat + STORY_BEATS.length) % STORY_BEATS.length);

  return (
    <main className="visual-story-page">
      <div className="visual-story-grid" aria-hidden="true" />
      <header className="visual-story-header">
        <div className="visual-story-kicker"><span className="visual-story-live-dot" /> ENOSX VISUAL STORY STUDIO</div>
        <div className="visual-story-header-actions">
          <button className="story-ghost-button" onClick={() => { setData(SAMPLE_DATA); setCsv(csvFor(SAMPLE_DATA)); setBeat(0); }}><RotateCcw size={14} /> Reset</button>
          <button className="story-primary-button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause story" : "Play story"}</button>
        </div>
      </header>

      <section className="visual-story-hero">
        <div className="visual-story-intro">
          <div className="story-orbit-mark"><WandSparkles size={18} /><span /></div>
          <p className="story-overline">Turn the signal into a story</p>
          <h1>Make your data<br /><em>impossible to ignore.</em></h1>
          <p className="story-deck">Bring numbers to life with cinematic transitions, clear narrative beats, and visuals that make the “why” feel immediate.</p>
          <div className="story-source-line"><Database size={14} /> Demo dataset · replace it with your own signal</div>
        </div>

        <div className="story-metric-cluster">
          <div className="story-metric-card story-metric-primary"><span>STORY ARC</span><strong>+{change}%</strong><small>from {data[0]?.label ?? "start"} to {data[data.length - 1]?.label ?? "finish"}</small></div>
          <div className="story-metric-card"><span>TOTAL SIGNAL</span><strong>{formatValue(total)}</strong><small>across {data.length} beats</small></div>
          <div className="story-metric-card"><span>PEAK MOMENT</span><strong>{formatValue(Math.max(...data.map((item) => item.value), 0))}</strong><small>{data.reduce((peak, item) => item.value > peak.value ? item : peak, data[0] ?? { label: "—", value: 0 }).label}</small></div>
        </div>
      </section>

      <section className="visual-story-workbench">
        <aside className="story-beat-rail" aria-label="Story beats">
          <div className="story-rail-heading"><span>THE NARRATIVE</span><span>{String(beat + 1).padStart(2, "0")} / 03</span></div>
          <div className="story-beat-list">
            {STORY_BEATS.map((item, index) => (
              <button key={item.eyebrow} className={`story-beat ${index === beat ? "is-active" : ""}`} onClick={() => goToBeat(index)}>
                <span className="story-beat-index">0{index + 1}</span>
                <span className="story-beat-copy"><b>{item.title}</b><small>{item.description}</small></span>
                <span className="story-beat-line" />
              </button>
            ))}
          </div>
          <div className="story-rail-footer"><Sparkles size={14} /> Motion is part of the explanation.</div>
        </aside>

        <div className="story-stage-wrap">
          <div className="story-stage-toolbar"><div><span className="story-stage-tag"><Activity size={12} /> LIVE STORY FRAME</span><span className="story-focus-label">Focus: {focusedLabel || "signal"}</span></div><div className="chart-mode-switcher">{(["area", "bar", "line"] as ChartMode[]).map((mode) => <button key={mode} className={chartMode === mode ? "is-selected" : ""} onClick={() => setChartMode(mode)}>{mode === "area" ? <Activity size={13} /> : mode === "bar" ? <BarChart3 size={13} /> : <LineChartIcon size={13} />}{mode}</button>)}</div></div>
          <div className="story-stage">
            <div className="story-stage-scanline" />
            <div className="story-stage-caption"><span>{activeStory.eyebrow}</span><AnimatePresence mode="wait"><motion.strong key={beat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{activeStory.title}</motion.strong></AnimatePresence></div>
            <AnimatePresence mode="wait">
              <motion.div key={`${chartMode}-${beat}-${data.length}`} className="story-chart" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.45 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === "area" ? <AreaChart data={chartData}><defs><linearGradient id="storyGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc143c" stopOpacity={0.7} /><stop offset="100%" stopColor="#7c6ff7" stopOpacity={0.04} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={{ background: "#14141d", border: "1px solid rgba(220,20,60,.35)", borderRadius: 10, color: "#fff" }} /><Area type="monotone" dataKey="value" stroke="#dc143c" strokeWidth={3} fill="url(#storyGradient)" animationDuration={900} /></AreaChart> : chartMode === "bar" ? <BarChart data={chartData}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={{ background: "#14141d", border: "1px solid rgba(220,20,60,.35)", borderRadius: 10, color: "#fff" }} /><Bar dataKey="value" fill="#dc143c" radius={[5, 5, 0, 0]} animationDuration={900} /></BarChart> : <LineChart data={chartData}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={{ background: "#14141d", border: "1px solid rgba(220,20,60,.35)", borderRadius: 10, color: "#fff" }} /><Line type="monotone" dataKey="value" stroke="#dc143c" strokeWidth={3} dot={{ fill: "#dc143c", r: 4 }} activeDot={{ r: 7, fill: "#fff", stroke: "#dc143c", strokeWidth: 3 }} animationDuration={900} /></LineChart>}
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
            <div className="story-stage-footnote">{activeStory.description}</div>
          </div>
          <div className="story-stage-controls"><button className="icon-control" onClick={() => goToBeat(beat - 1)} aria-label="Previous beat"><ChevronLeft size={17} /></button><div className="story-progress"><span style={{ width: `${((beat + 1) / STORY_BEATS.length) * 100}%` }} /></div><button className="icon-control" onClick={() => goToBeat(beat + 1)} aria-label="Next beat"><ChevronRight size={17} /></button><span className="story-timecode">0{beat + 1} · 04.2s</span></div>
        </div>
      </section>

      <section className="story-data-panel">
        <button className="story-data-toggle" onClick={() => setShowData((value) => !value)}><FileText size={15} /><span>{showData ? "Hide source data" : "Edit source data"}</span><small>CSV · label,value</small></button>
        <AnimatePresence initial={false}>{showData && <motion.div className="story-data-editor" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><div><textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="CSV source data" spellCheck={false} /><p>Paste two columns with no header. ENOSX will animate the story around your signal.</p></div><button className="story-primary-button" onClick={applyCsv}><Upload size={14} /> Apply data</button></motion.div>}</AnimatePresence>
      </section>
    </main>
  );
}
