export interface FollowUpSuggestion {
  id: string;
  text: string;
}

const SETUP_PROMPTS = [
  "Turn this into a step-by-step checklist.",
  "Show me a minimal working example.",
  "What should I verify before going live?",
];

const CODE_PROMPTS = [
  "Add tests and error handling for this.",
  "Show a complete end-to-end example.",
  "Explain how to run this locally.",
];

const GENERAL_PROMPTS = [
  "Give me a practical example.",
  "Explain the key points in simpler terms.",
  "What would be a useful next step?",
];

/**
 * Suggest follow-ups locally from the current exchange; this helper does not
 * make an extra model request or transmit conversation text to another service.
 */
export function getFollowUpSuggestions(userPrompt: string, assistantReply: string): FollowUpSuggestion[] {
  const context = `${userPrompt}\n${assistantReply}`.toLowerCase();
  const prompts = /install|setup|deploy|deployment|configure|configuration|readme|documentation|checklist/.test(context)
    ? SETUP_PROMPTS
    : /```|\b(api|endpoint|code|function|typescript|javascript|python|test|package|script|bug)\b/.test(context)
      ? CODE_PROMPTS
      : GENERAL_PROMPTS;

  return prompts.map((text, index) => ({ id: `follow-up-${index + 1}`, text }));
}
