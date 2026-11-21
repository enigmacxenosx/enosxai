import { describe, expect, it } from "vitest";
import { getModelTierRecommendation, recommendModelTierForPrompt } from "./modelTierPolicy";

describe("model tier action policy", () => {
  it("uses ENOSX One for fast everyday work", () => {
    expect(getModelTierRecommendation("everyday_chat")?.mode).toBe("ex-core");
    expect(getModelTierRecommendation("summarize_translate")?.mode).toBe("ex-core");
  });

  it("uses ENOSX Studio for technical and evidence-oriented work", () => {
    expect(getModelTierRecommendation("coding_debugging")?.mode).toBe("ex-pro");
    expect(getModelTierRecommendation("research")?.mode).toBe("ex-pro");
    expect(getModelTierRecommendation("github_work")?.mode).toBe("ex-pro");
    expect(getModelTierRecommendation("image_understanding")?.mode).toBe("ex-pro");
  });

  it("uses ENOSX Nexus for strategic and difficult analysis", () => {
    expect(getModelTierRecommendation("architecture_strategy")?.mode).toBe("enosh-mind");
    expect(getModelTierRecommendation("complex_science_math")?.mode).toBe("enosh-mind");
    expect(getModelTierRecommendation("high_stakes_decision")?.mode).toBe("enosh-mind");
  });

  it("detects high-confidence prompt categories for user notifications", () => {
    expect(recommendModelTierForPrompt("Review this GitHub pull request")?.mode).toBe("ex-pro");
    expect(recommendModelTierForPrompt("Compare the architecture trade-offs")?.mode).toBe("enosh-mind");
    expect(recommendModelTierForPrompt("Solve this circuit equation")?.mode).toBe("enosh-mind");
    expect(recommendModelTierForPrompt("What is the weather today?")).toBeUndefined();
  });

  it("uses Studio for attached documents and images", () => {
    expect(recommendModelTierForPrompt("Please review this file", { hasAttachments: true })?.mode).toBe("ex-pro");
    expect(recommendModelTierForPrompt("What is in this upload?", { hasImageAttachment: true })?.mode).toBe("ex-pro");
  });
});
