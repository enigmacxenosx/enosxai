import { describe, expect, it } from "vitest";
import { generateConversationTitle } from "./conversationTitle";

describe("generateConversationTitle", () => {
  it("removes conversational filler and keeps the actual request", () => {
    expect(generateConversationTitle("Can you help me build a simple portfolio website for my design work?"))
      .toBe("Build a Simple Portfolio Website for My Design Work");
  });

  it("removes longer lead-in phrases from chat names", () => {
    expect(generateConversationTitle("I am trying to create a launch plan for my new product"))
      .toBe("Create a Launch Plan for My New Product");
    expect(generateConversationTitle("Could you please help me with a concise project brief?"))
      .toBe("A Concise Project Brief");
  });

  it("cleans common question prefixes and trailing punctuation", () => {
    expect(generateConversationTitle("I was wondering if you could explain Kenya's startup tax rules..."))
      .toBe("Explain Kenya's Startup Tax Rules");
    expect(generateConversationTitle("Please give me a three-step morning routine!!!"))
      .toBe("A Three-Step Morning Routine");
    expect(generateConversationTitle("I have a question about remote team rituals —"))
      .toBe("Remote Team Rituals");
  });

  it("uses only the first sentence and removes ending punctuation", () => {
    expect(generateConversationTitle("I want to create a marketing plan for Enosx Technologies. Include a budget too."))
      .toBe("Create a Marketing Plan for Enosx Technologies");
  });

  it("keeps titles concise at a word boundary", () => {
    const title = generateConversationTitle("Please help me understand how to develop a complete business strategy for a technology startup entering the East African market next year");
    expect(title.length).toBeLessThanOrEqual(56);
    expect(title.endsWith("...")).toBe(false);
  });

  it("falls back for an empty prompt", () => {
    expect(generateConversationTitle("   ")).toBe("New Chat");
  });
});
