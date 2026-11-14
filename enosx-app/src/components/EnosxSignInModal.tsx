import { useRef, useState } from "react";
import { ArrowRight, Clock3, FileSpreadsheet, GitBranch, Mail, MessageSquare, X } from "lucide-react";
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
];

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
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

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
            <p className="enosx-signin-caption">AI workflow automation that runs on a schedule or trigger</p>
            <div className="enosx-signin-progress" aria-hidden="true"><i /><i /><i /><i /></div>
          </div>
        </aside>

        <section className="enosx-signin-form-panel">
          <button type="button" className="enosx-signin-close" onClick={onClose} aria-label="Close sign-in"><X size={18} /></button>
          <div className="enosx-signin-mark" aria-hidden="true">E</div>
          <h1 id="enosx-signin-title">{formTitle}</h1>
          <p className="enosx-signin-subtitle">{formSubtitle}</p>

          <button type="button" className="enosx-signin-provider" onClick={() => handleProvider("Google")} disabled={isLoading}>
            <span className="enosx-google-mark" aria-hidden="true">G</span>Continue with Google
            <span className="enosx-signin-last-used">Recommended</span>
          </button>
          <button type="button" className="enosx-signin-provider" onClick={() => handleProvider("Microsoft")} disabled={isLoading}>
            <span className="enosx-microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>Continue with Microsoft
          </button>
          <button type="button" className="enosx-signin-provider" onClick={() => { setPhoneMode(true); setMessage(""); setProviderMessage(""); }} disabled={isLoading}>
            <span className="enosx-phone-mark" aria-hidden="true">＋</span>Continue with phone
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
