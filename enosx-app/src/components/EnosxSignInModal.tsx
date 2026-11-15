import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, FileSpreadsheet, FileText, GitBranch, Mail, MessageSquare, Phone, ShoppingBag, X } from "lucide-react";
import { RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseAuth } from "@/lib/firebase";

interface EnosxSignInModalProps {
  onClose: () => void;
}

const workflows = [
  { icons: [Mail, "→", FileSpreadsheet], label: "Log email invoices in a spreadsheet" },
  { icons: [Clock3, FileSpreadsheet, "→", MessageSquare], label: "Automated sales reporting from spreadsheets" },
  { icons: [Clock3, Mail, "→"], label: "Summarize customer emails every Monday" },
  { icons: [GitBranch, "→"], label: "Review new pull requests" },
  { icons: [ShoppingBag, "→", Mail], label: "Follow up on store refunds by email" },
  { icons: [CalendarDays, "→", FileText], label: "Prep for calendar meetings in your notes" },
];

const captions = [
  "AI workflow automation that runs on a schedule or trigger",
  "Connect the tools your team already uses",
  "Describe a task once and let it repeat",
  "Review every run and stay in control",
];

function ProviderLogo({ provider }: { provider: "google" | "instagram" | "whatsapp" }) {
  if (provider === "google") return <svg className="enosx-provider-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.41-.18-2.08H12v3.94h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.25Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.97.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.54 13.84A5.85 5.85 0 0 1 6.23 12c0-.64.11-1.26.31-1.84V7.63H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.37l3.24-2.53Z" /><path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.25 14.63 2.25 12 2.25A9.74 9.74 0 0 0 3.3 7.63l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z" /></svg>;
  if (provider === "instagram") return <span className="enosx-instagram-mark" aria-hidden="true"><span /></span>;
  return <span className="enosx-whatsapp-mark" aria-hidden="true"><Phone size={13} strokeWidth={2.5} /></span>;
}

export default function EnosxSignInModal({ onClose }: EnosxSignInModalProps) {
  const { signInWithGoogle, signInWithEmail, sendPhoneCode, confirmPhoneCode, continueAsGuest, error, clearError, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneMode, setPhoneMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [captionIndex, setCaptionIndex] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setCaptionIndex((index) => (index + 1) % captions.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formTitle = phoneMode ? (phoneConfirmation ? "Check your phone" : "Sign in with phone") : (showPassword ? "Enter your password" : "Welcome to ENOSX");
  const formSubtitle = phoneMode ? (phoneConfirmation ? `Enter the code sent to ${phone}` : "We’ll send a verification code by SMS") : (showPassword ? email : "Sign in or sign up");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setMessage("");
    if (!validEmail) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (!showPassword) {
      setShowPassword(true);
      return;
    }
    if (!password) {
      setMessage("Enter your password to continue.");
      return;
    }
    await signInWithEmail(email, password);
  };

  const returnToProviderForm = () => {
    setPhoneMode(false);
    setShowPassword(false);
    setPhoneConfirmation(null);
    setPhoneCode("");
    setMessage("");
    clearError();
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  const handleProvider = (provider: string) => {
    clearError();
    setProviderMessage("");
    if (provider === "Google") {
      signInWithGoogle();
      return;
    }
    setProviderMessage(`${provider} sign-in is not configured yet.`);
  };

  const handlePhoneSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setMessage("");
    if (!phoneConfirmation) {
      if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
        setMessage("Enter your number in international format, for example +254712345678.");
        return;
      }
      if (!firebaseAuth) {
        setMessage("Phone sign-in needs Firebase Authentication to be configured.");
        return;
      }
      try {
        if (!recaptchaRef.current) {
          recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "enosx-phone-recaptcha", { size: "invisible" });
        }
        const confirmation = await sendPhoneCode(phone, recaptchaRef.current);
        if (confirmation) {
          setPhoneConfirmation(confirmation);
          setMessage("Verification code sent by SMS.");
        }
      } catch (verificationError) {
        setMessage(verificationError instanceof Error ? verificationError.message : "Could not start phone verification.");
      }
      return;
    }
    if (!/^\d{6}$/.test(phoneCode.trim())) {
      setMessage("Enter the 6-digit verification code.");
      return;
    }
    await confirmPhoneCode(phoneConfirmation, phoneCode);
  };

  return (
    <div className="enosx-signin-scrim" role="dialog" aria-modal="true" aria-labelledby="enosx-signin-title">
      <div className="enosx-signin-modal">
        <aside className="enosx-signin-story" aria-label="ENOSX workflow examples">
          <div className="enosx-signin-workflows">
            {workflows.map((workflow) => (
              <div className="enosx-signin-workflow" key={workflow.label}>
                <span className="enosx-signin-chain">
                  {workflow.icons.map((item, index) => {
                    if (typeof item === "string") return <span className="enosx-signin-arrow" key={`${workflow.label}-${index}`}>{item}</span>;
                    const Icon = item;
                    return <span className="enosx-signin-icon" key={`${workflow.label}-${index}`}><Icon size={15} strokeWidth={1.8} /></span>;
                  })}
                </span>
                <span>{workflow.label}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="enosx-signin-caption" aria-live="polite">{captions[captionIndex]}</p>
            <div className="enosx-signin-progress" aria-hidden="true">{captions.map((_, index) => <i key={index} className={index === captionIndex ? "is-active" : index < captionIndex ? "is-done" : ""} />)}</div>
          </div>
        </aside>

        <section className="enosx-signin-form-panel">
          <button type="button" className="enosx-signin-close" onClick={onClose} aria-label="Close sign-in"><X size={18} /></button>
          <img className="enosx-signin-mark" src="/enosx-logo.svg" alt="ENOSX AI" />
          <h1 id="enosx-signin-title">{formTitle}</h1>
          <p className="enosx-signin-subtitle">{formSubtitle}</p>

          <button type="button" className="enosx-signin-provider" onClick={() => handleProvider("Google")} disabled={isLoading}>
            <ProviderLogo provider="google" />Continue with Google
            <span className="enosx-signin-last-used">Recommended</span>
          </button>
          <button type="button" className="enosx-signin-provider" onClick={() => handleProvider("Instagram")} disabled={isLoading}>
            <ProviderLogo provider="instagram" />Continue with Instagram
          </button>
          <button type="button" className="enosx-signin-provider" onClick={() => { setPhoneMode(true); setMessage(""); setProviderMessage(""); }} disabled={isLoading}>
            <ProviderLogo provider="whatsapp" />Continue with phone
            <span className="enosx-phone-hint">SMS</span>
          </button>

          <div className="enosx-signin-or"><span>Or</span></div>
          {(phoneMode || showPassword) && <button type="button" className="enosx-signin-back" onClick={returnToProviderForm}>← Back to sign-in options</button>}
          <div className="enosx-signin-form-state">
          {phoneMode ? <form onSubmit={handlePhoneSubmit} noValidate>
            <label className="sr-only" htmlFor="enosx-signin-phone">Mobile number</label>
            <input id="enosx-signin-phone" type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setMessage(""); }} placeholder="Mobile number (+254...)" autoComplete="tel" disabled={Boolean(phoneConfirmation)} />
            {phoneConfirmation && <><label className="sr-only" htmlFor="enosx-signin-code">SMS verification code</label><input id="enosx-signin-code" inputMode="numeric" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit verification code" autoComplete="one-time-code" /></>}
            <div id="enosx-phone-recaptcha" />
            <button className={`enosx-signin-submit ${phone.trim() ? "is-ready" : ""}`} type="submit" disabled={isLoading}>{isLoading ? "Verifying…" : phoneConfirmation ? "Verify code" : "Send SMS code"}<ArrowRight size={16} /></button>
            <button type="button" className="enosx-signin-guest" onClick={returnToProviderForm}>Use email instead</button>
          </form> : <form onSubmit={handleSubmit} noValidate>
            <label className="sr-only" htmlFor="enosx-signin-email">Email address</label>
            <input id="enosx-signin-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(""); }} placeholder="Enter your email address" autoComplete="email" />
            {showPassword && <><label className="sr-only" htmlFor="enosx-signin-password">Password</label><input id="enosx-signin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" /></>}
            <button className={`enosx-signin-submit ${validEmail ? "is-ready" : ""}`} type="submit" disabled={isLoading}>{isLoading ? "Signing in…" : showPassword ? "Sign in" : "Continue"}<ArrowRight size={16} /></button>
          </form>}
          </div>
          {(message || providerMessage || error) && <p className="enosx-signin-message" role="status">{message || providerMessage || error}</p>}
          <button type="button" className="enosx-signin-guest" onClick={() => { continueAsGuest(); onClose(); }}>Continue as guest</button>
          <p className="enosx-signin-terms">By continuing, you agree to our <a href="#terms">Terms of Service</a> and have read our <a href="#privacy">Privacy Policy</a>.</p>
        </section>
      </div>
    </div>
  );
}
