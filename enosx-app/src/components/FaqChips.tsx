/*
 * ENOSX AI — FaqChips
 * Guided FAQ flow starters shown below the welcome message and near the
 * composer. Tapping a chip sends its verified prompt straight into the chat.
 */

import { FAQ_TOPICS } from "@/lib/faqTopics";

interface FaqChipsProps {
  onSend: (text: string) => void;
  limit?: number;
}

export default function FaqChips({ onSend, limit = 5 }: FaqChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FAQ_TOPICS.slice(0, limit).map((topic) => (
        <button
          key={topic.id}
          onClick={() => onSend(topic.prompt)}
          className="h-7 px-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-[0.97] border border-white/10 hover:border-white/20 text-[12px] font-medium text-white/75 hover:text-white flex items-center gap-1.5 transition-all"
        >
          <span>{topic.icon}</span>
          {topic.label}
        </button>
      ))}
    </div>
  );
}
