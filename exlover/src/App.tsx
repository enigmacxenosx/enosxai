import { FormEvent, useEffect, useMemo, useState } from "react";
import "./styles.css";

type Role = "user" | "assistant";
type Mode = "clarity" | "communication" | "boundaries" | "healing";

type Message = {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
};

type Starter = {
  label: string;
  title: string;
  description: string;
  prompt: string;
  tone: string;
};

const starters: Starter[] = [
  {
    label: "CLARITY",
    title: "I need to understand what I feel",
    description: "Untangle the signal from the story and name what matters.",
    prompt: "I feel confused about a relationship and want help understanding what I actually need.",
    tone: "lavender",
  },
  {
    label: "COMMUNICATION",
    title: "I want to say it well",
    description: "Turn a difficult feeling into an honest, kind conversation.",
    prompt: "Help me prepare for a difficult relationship conversation without sounding accusatory.",
    tone: "peach",
  },
  {
    label: "BOUNDARIES",
    title: "I need a healthier boundary",
    description: "Find language that protects your peace without creating a performance.",
    prompt: "I need help setting a clear boundary with someone I care about.",
    tone: "sage",
  },
  {
    label: "HEALING",
    title: "I am trying to move forward",
    description: "Make space for grief, growth, and the next small choice.",
    prompt: "I am healing after a breakup and want a grounded way to move forward.",
    tone: "rose",
  },
];

const dailyPrompt = "What would feel honest, kind, and self-respecting today?";
const storageKey = "exlover-conversation-v1";

const initialAssistantMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I’m ExLover Coach. Bring me the messy version — the text you keep rereading, the feeling you cannot name, or the conversation you are rehearsing. We’ll slow it down, find the honest need underneath, and choose one grounded next step.\n\nWhat is on your heart?",
  timestamp: "Now",
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function demoReply(userMessage: string) {
  const lower = userMessage.toLowerCase();
  if (lower.includes("boundary")) {
    return "A boundary is not a threat or a test; it is a clear statement of what you will do to stay well. Try this shape: “When X happens, I feel Y. I need Z going forward. If that cannot happen, I will do A.”\n\nBefore you send it, ask yourself: is the boundary specific, possible for you to keep, and about your action rather than controlling theirs?";
  }
  if (lower.includes("breakup") || lower.includes("healing") || lower.includes("move forward")) {
    return "Healing rarely feels like a straight line. For today, separate the ache from the assignment: you do not have to decide your whole future while you are still grieving.\n\nA gentle next step could be choosing one source of steadiness — a walk, a friend you trust, or a no-contact window long enough for your nervous system to settle. What part feels hardest right now: missing them, losing the future you pictured, or questioning yourself?";
  }
  if (lower.includes("conversation") || lower.includes("say")) {
    return "Let’s make the conversation less about winning a reaction and more about making your truth easy to understand. Start with observation, impact, need, and invitation: “When I notice __, I feel __. I need __. Can we talk about __?”\n\nWhat do you most want them to understand, even if they do not agree?";
  }
  return "Let’s slow this down together. I hear that something in this relationship is asking for clarity, not another round of guessing.\n\nTry finishing this sentence without editing yourself: “The part I am afraid to admit is…” That answer often points to the need underneath the immediate problem. What comes up?";
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);
  const [draft, setDraft] = useState("");
  const [activeMode, setActiveMode] = useState<Mode>("clarity");
  const [isSending, setIsSending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // Local history is a convenience, never a reason to block the coach.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage restrictions in private browsing contexts.
    }
  }, [messages]);

  const userMessageCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: formatTime(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setIsSending(true);
    setIsSaved(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: activeMode,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Coach unavailable");

      const assistantContent = typeof payload.reply === "string" ? payload.reply : demoReply(text);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
          timestamp: formatTime(),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: demoReply(text),
          timestamp: formatTime(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  const startOver = () => {
    setMessages([initialAssistantMessage]);
    setDraft("");
    setIsSaved(false);
    window.localStorage.removeItem(storageKey);
  };

  const saveReflection = () => {
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2400);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ExLover home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span><strong>ExLover</strong><small>COACH</small></span>
        </a>
        <div className="topbar-actions">
          <button className="text-button" onClick={() => setShowAbout(true)}>How it works</button>
          <button className="quiet-button" onClick={startOver}>New reflection <span>↗</span></button>
        </div>
      </header>

      <main className="main-grid">
        <section className="intro-panel">
          <div className="eyebrow"><span className="eyebrow-dot" />A private space for honest conversations</div>
          <h1>Love, with <em>clarity.</em></h1>
          <p className="intro-copy">An AI relationship coach for the moments you need to pause, understand yourself, and respond from a steadier place.</p>
          <div className="trust-line"><span className="lock-icon">⌁</span> No judgement · No perfect answers · Just a little more clarity</div>

          <div className="starter-grid" aria-label="Choose a coaching intention">
            {starters.map((starter) => (
              <button className={`starter-card ${starter.tone}`} key={starter.label} onClick={() => { setActiveMode(starter.label.toLowerCase() as Mode); void sendMessage(starter.prompt); }}>
                <span className="card-label">{starter.label}</span>
                <strong>{starter.title}</strong>
                <span className="card-description">{starter.description}</span>
                <span className="card-arrow">↗</span>
              </button>
            ))}
          </div>

          <div className="prompt-card">
            <div className="prompt-orb" aria-hidden="true"><span /></div>
            <div>
              <span className="card-label">TODAY’S GENTLE PROMPT</span>
              <p>{dailyPrompt}</p>
            </div>
            <button aria-label="Use today's prompt" onClick={() => void sendMessage(dailyPrompt)}>Use prompt <span>→</span></button>
          </div>
        </section>

        <section className="coach-panel" aria-label="ExLover Coach conversation">
          <div className="coach-heading">
            <div>
              <div className="coach-title"><span className="live-dot" />Coach room</div>
              <p>A quiet place to hear yourself think.</p>
            </div>
            <div className="coach-count"><strong>{String(userMessageCount).padStart(2, "0")}</strong><span>reflections</span></div>
          </div>

          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                {message.role === "assistant" && <div className="avatar" aria-hidden="true"><span /></div>}
                <div className="message-body">
                  <div className="message-meta"><strong>{message.role === "assistant" ? "ExLover Coach" : "You"}</strong><span>{message.timestamp}</span></div>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
            {isSending && (
              <article className="message assistant">
                <div className="avatar" aria-hidden="true"><span /></div>
                <div className="message-body"><div className="message-meta"><strong>ExLover Coach</strong><span>thinking</span></div><p className="typing"><i /><i /><i /></p></div>
              </article>
            )}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Tell me what’s on your mind…" rows={3} aria-label="Message ExLover Coach" />
            <div className="composer-footer">
              <span>ExLover is a reflection tool, not a replacement for professional support.</span>
              <button className="send-button" type="submit" disabled={!draft.trim() || isSending} aria-label="Send message">{isSending ? "…" : "Send"}<span>↗</span></button>
            </div>
          </form>
        </section>
      </main>

      <footer className="footer">
        <span>© 2026 ExLover Coach · Built for more thoughtful conversations.</span>
        <div><button className="footer-button" onClick={saveReflection}>{isSaved ? "Saved locally" : "Save reflection"}</button><span className="footer-divider">·</span><button className="footer-button" onClick={() => setShowAbout(true)}>Care & safety</button></div>
      </footer>

      {showAbout && <div className="modal-backdrop" role="presentation" onClick={() => setShowAbout(false)}>
        <div className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowAbout(false)} aria-label="Close">×</button>
          <span className="card-label">A NOTE FROM THE COACH</span>
          <h2 id="about-title">You do not need to perform certainty.</h2>
          <p>ExLover helps you slow down, name what is happening, and choose language that respects both your needs and another person’s agency. It is not a therapist, crisis service, or a way to diagnose someone else.</p>
          <p>If you are in immediate danger, being threatened, or thinking about harming yourself or someone else, contact local emergency services or a trusted person who can be with you now.</p>
          <button className="modal-action" onClick={() => setShowAbout(false)}>I understand <span>→</span></button>
        </div>
      </div>}
    </div>
  );
}
