import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, CheckCircle2, ChevronRight, RefreshCw, ShieldCheck, X } from "lucide-react";

interface EthicalHackingQuizProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

const quizQuestions: QuizQuestion[] = [
  {
    prompt: "Before beginning any lab assessment, what is the most important first step?",
    choices: [
      "Validate written authorization and the agreed scope",
      "Run a broad discovery scan to see what responds",
      "Search for default credentials",
      "Disable monitoring so test activity is not logged",
    ],
    answer: 0,
    explanation: "Authorization and scope define the boundaries that make an assessment ethical, safe, and lawful.",
  },
  {
    prompt: "A simulated vulnerability review identifies outdated software. What is the best defensive recommendation?",
    choices: [
      "Document the affected version, prioritize the patch, and verify remediation",
      "Publish the issue immediately without notifying the owner",
      "Attempt to exploit it outside the lab to confirm impact",
      "Ignore it if no visible error appears",
    ],
    answer: 0,
    explanation: "A responsible assessment records evidence, recommends a prioritized fix, and verifies the remediation with permission.",
  },
  {
    prompt: "Which practice most improves the security of a home or lab WiFi network?",
    choices: [
      "Use WPA3 where available, a unique passphrase, and current firmware",
      "Leave the router's default administrator password unchanged",
      "Enable legacy WEP for compatibility",
      "Share one password publicly so everyone can connect",
    ],
    answer: 0,
    explanation: "Modern encryption, unique credentials, and timely firmware updates reduce common wireless risks.",
  },
  {
    prompt: "What should a responsible penetration-test report contain?",
    choices: [
      "Scope, evidence, risk context, remediation guidance, and limitations",
      "Only a list of tools used",
      "Credentials or private data collected during the exercise",
      "Instructions to conceal activity from the system owner",
    ],
    answer: 0,
    explanation: "A useful report enables the owner to understand the risk and fix it, without exposing unnecessary sensitive information.",
  },
  {
    prompt: "In an authorized web-security lab, which control is a sound baseline for reducing injection risk?",
    choices: [
      "Use parameterized queries, validate inputs, and apply least privilege",
      "Trust all user-supplied input after it reaches the server",
      "Store passwords in readable text for easier debugging",
      "Give every application account administrator permissions",
    ],
    answer: 0,
    explanation: "Parameterized queries, validation, and least privilege make common injection paths significantly harder to exploit.",
  },
];

export default function EthicalHackingQuiz({ isOpen, onClose }: EthicalHackingQuizProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const question = quizQuestions[questionIndex];
  const isLastQuestion = questionIndex === quizQuestions.length - 1;
  const hasAnswered = selectedAnswer !== null;
  const score = useMemo(
    () => answers.reduce((total, answer, index) => total + (answer === quizQuestions[index].answer ? 1 : 0), 0),
    [answers],
  );
  const completed = answers.length === quizQuestions.length;

  const resetQuiz = () => {
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers([]);
  };

  const handleContinue = () => {
    if (selectedAnswer === null) return;

    const nextAnswers = [...answers, selectedAnswer];
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      setSelectedAnswer(null);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedAnswer(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ethical-hacking-quiz-title"
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-300/25 bg-slate-950/95 shadow-[0_0_80px_rgba(34,211,238,0.15)]"
          >
            <header className="flex items-center justify-between border-b border-cyan-300/15 bg-cyan-300/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-2 text-cyan-200">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.22em] text-cyan-300">ENOSX LAB ACADEMY</p>
                  <h2 id="ethical-hacking-quiz-title" className="text-lg font-bold text-white">Ethical Hacking Concepts Quiz</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close quiz"
              >
                <X size={19} />
              </button>
            </header>

            {completed ? (
              <div className="space-y-6 px-6 py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-300">
                  <Award size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-[0.16em] text-cyan-300">QUIZ COMPLETE</p>
                  <h3 className="mt-2 text-3xl font-bold text-white">{score} / {quizQuestions.length}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {score === quizQuestions.length
                      ? "Excellent work. You demonstrated strong judgment across scope, remediation, wireless hardening, reporting, and secure development."
                      : "Review the explanations and repeat the quiz whenever you are ready. Responsible testing starts with sound security fundamentals."}
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/25 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/10"
                  >
                    <RefreshCw size={16} />
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Return to GOD MODE
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-6">
                <div className="mb-6 flex items-center justify-between gap-4 text-xs font-semibold text-slate-300">
                  <span>Question {questionIndex + 1} of {quizQuestions.length}</span>
                  <span className="text-cyan-300">Lab-safe learning</span>
                </div>
                <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-cyan-300"
                    animate={{ width: `${((questionIndex + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>

                <h3 className="text-xl font-semibold leading-8 text-white">{question.prompt}</h3>
                <div className="mt-6 space-y-3">
                  {question.choices.map((choice, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === question.answer;
                    const revealCorrectness = hasAnswered;
                    const borderClass = revealCorrectness
                      ? isCorrect
                        ? "border-emerald-300/50 bg-emerald-300/10"
                        : isSelected
                          ? "border-red-300/50 bg-red-300/10"
                          : "border-white/10 bg-white/[0.025]"
                      : isSelected
                        ? "border-cyan-300/60 bg-cyan-300/10"
                        : "border-white/10 bg-white/[0.025] hover:border-cyan-300/35 hover:bg-cyan-300/[0.05]";

                    return (
                      <button
                        key={choice}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => setSelectedAnswer(index)}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm text-slate-100 transition ${borderClass}`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold text-cyan-200">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="pt-0.5">{choice}</span>
                        {revealCorrectness && isCorrect && <CheckCircle2 className="ml-auto shrink-0 text-emerald-300" size={19} />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {hasAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${selectedAnswer === question.answer ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-50" : "border-amber-300/25 bg-amber-300/10 text-amber-50"}`}
                    >
                      <span className="font-bold">{selectedAnswer === question.answer ? "Correct. " : "Consider this. "}</span>
                      {question.explanation}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!hasAnswered}
                    onClick={handleContinue}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isLastQuestion ? "View results" : "Continue"}
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
