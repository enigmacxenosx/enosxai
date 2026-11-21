const SMALL_TITLE_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);
const MAX_TITLE_LENGTH = 56;

function titleCase(value: string): string {
  return value.split(/\s+/).map((word, index) => {
    if (word.length > 1 && word === word.toLocaleUpperCase()) return word;
    const lower = word.toLocaleLowerCase();
    if (index > 0 && SMALL_TITLE_WORDS.has(lower)) return lower;
    return lower.replace(/(^|[-'])\p{L}/gu, (part) => part.toLocaleUpperCase());
  }).join(" ");
}

export function generateConversationTitle(firstMessage: string): string {
  let title = firstMessage.replace(/\s+/g, " ").trim();
  if (!title) return "New Chat";

  title = title
    .replace(/^(?:hey|hi|hello)\s+(?:enosx(?:\s+ai)?|agent)[,\s:!-]*/i, "")
    .replace(/^(?:please\s+)?(?:can|could|would)\s+you(?:\s+please)?(?:\s+help\s+me)?(?:\s+with)?\s+/i, "")
    .replace(/^(?:please\s+)?(?:i am|i'm|i’m)\s+(?:trying\s+to|looking\s+to|hoping\s+to)\s+/i, "")
    .replace(/^(?:please\s+)?(?:i want to|i need to|i would like to|i'd like to|help me to|help me|i need help with|i need help)\s+/i, "")
    .replace(/^(?:how do i|how can i|how should i)\s+/i, "")
    .replace(/^please\s+/i, "");

  const firstSentence = title.split(/(?<=[.!?])\s+/)[0] || title;
  title = firstSentence.replace(/[.!?]+$/g, "").trim();
  if (!title) return "New Chat";

  const words = title.split(/\s+/);
  let clipped = words[0];
  for (const word of words.slice(1)) {
    if (`${clipped} ${word}`.length > MAX_TITLE_LENGTH) break;
    clipped += ` ${word}`;
  }

  return titleCase(clipped);
}
