import { describe, expect, it } from "vitest";
import { COMPANY_FACTS, ENOSX_AI_TIER_FACTS, WEBSITE_URL } from "./const";

describe("ENOSX product information core", () => {
  it("identifies the correct company site and current portfolio", () => {
    expect(WEBSITE_URL).toBe("https://enosxtech.vercel.app");
    expect(COMPANY_FACTS.join(" ")).toContain("Enosx Tech Store");
    expect(COMPANY_FACTS.join(" ")).toContain("multimodal AI workspace");
  });

  it("maps user-facing tiers to internal routes and reports configurable model fallbacks", () => {
    const facts = ENOSX_AI_TIER_FACTS.join(" ");
    expect(facts).toContain("ENOSX One (internal mode ID ex-core)");
    expect(facts).toContain("ENOSX Studio (ex-pro)");
    expect(facts).toContain("ENOSX Nexus (enosh-mind)");
    expect(facts).toContain("both fall back to NVIDIA_MODEL");
    expect(facts).toContain("NVIDIA_ENOSH_MIND_MODEL");
    expect(facts).toContain("not guaranteed correctness");
  });

  it("states provider and modality limits without promising every capability is active", () => {
    const facts = ENOSX_AI_TIER_FACTS.join(" ");
    expect(facts).toContain("text-only");
    expect(facts).toContain("TAVILY_API_KEY");
    expect(facts).toContain("Provider configuration");
    expect(facts).toContain("unless the runtime returns evidence");
  });
});
