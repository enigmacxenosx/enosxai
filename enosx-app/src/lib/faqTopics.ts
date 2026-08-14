/*
 * ENOSX AI — faqTopics
 * Guided FAQ flow starters. Each topic sends a prefilled, verified question
 * so users can quickly reach the right company information. Topics are kept
 * factual and route pricing/career/availability questions to the website.
 */

export interface FaqTopic {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export const FAQ_TOPICS: FaqTopic[] = [
  {
    id: "store",
    label: "Enosx Tech Store",
    icon: "🛍️",
    prompt: "Tell me about the Enosx Tech Store and how to find current products and offers.",
  },
  {
    id: "exlover",
    label: "ExLover Coach",
    icon: "💬",
    prompt: "What is ExLover Coach and how does it help users?",
  },
  {
    id: "pricing",
    label: "Pricing & Plans",
    icon: "💳",
    prompt: "Where can I find the current ENOSX AI pricing and plan details?",
  },
  {
    id: "careers",
    label: "Careers",
    icon: "💼",
    prompt: "Are there open roles at Enosx Technologies right now, and where should I apply?",
  },
  {
    id: "support",
    label: "Contact Support",
    icon: "📞",
    prompt: "How can I reach the Enosx Technologies support team directly?",
  },
];
