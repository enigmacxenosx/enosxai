import { describe, expect, it } from "vitest";
import { getFollowUpSuggestions } from "./followUpSuggestions";

describe("getFollowUpSuggestions", () => {
  it("returns three setup-focused prompts for setup and deployment exchanges", () => {
    const suggestions = getFollowUpSuggestions("Help me deploy the app", "Configure the deployment settings.");
    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((item) => item.text)).toContain("What should I verify before going live?");
  });

  it("returns coding prompts when the exchange concerns implementation", () => {
    const suggestions = getFollowUpSuggestions("Write a TypeScript API endpoint", "Here is the code.");
    expect(suggestions.map((item) => item.text)).toContain("Add tests and error handling for this.");
  });

  it("returns general prompts for other answers", () => {
    const suggestions = getFollowUpSuggestions("Explain photosynthesis", "Plants convert light into stored energy.");
    expect(suggestions.map((item) => item.text)).toEqual([
      "Give me a practical example.",
      "Explain the key points in simpler terms.",
      "What would be a useful next step?",
    ]);
  });
});
