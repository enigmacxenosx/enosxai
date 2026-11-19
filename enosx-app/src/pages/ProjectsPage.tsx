import { FolderKanban, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { GlobalLayout } from "@/components/GlobalLayout";

export default function ProjectsPage() {
  const [, navigate] = useLocation();

  return (
    <GlobalLayout>
      <main className="flex h-full min-h-[calc(100vh-1px)] items-center justify-center overflow-auto bg-[#07090d]/80 px-6 py-12 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl sm:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            <FolderKanban size={28} strokeWidth={1.6} />
          </div>
          <p className="mb-3 text-[10px] font-bold tracking-[0.28em] text-cyan-300">ENOSX AI / WORKSPACE</p>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/55">
            Your project workspace is ready. Project organization and creation tools can be added here next.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15"
          >
            <Sparkles size={15} />
            Back to ENOSX AI
          </button>
        </section>
      </main>
    </GlobalLayout>
  );
}
