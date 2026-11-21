import { describe, expect, it } from "vitest";
import { isImageGenerationRequest } from "./mediaIntent";

describe("isImageGenerationRequest", () => {
  it.each([
    "Generate an image of a red fox in a snowy forest",
    "Can you create a logo for my bakery?",
    "Draw a watercolor portrait of a tabby cat",
    "Make me a phone wallpaper with northern lights",
    "Please design an icon for a calendar app",
  ])("recognizes a direct image-generation request: %s", (prompt) => {
    expect(isImageGenerationRequest(prompt)).toBe(true);
  });

  it.each([
    "",
    "Find images of red foxes online",
    "Search the web for photos of the northern lights",
    "Explain how image generation works",
    "What is a good image format for a website?",
    "Summarize this article about AI image tools",
    "Create a short video of a red fox",
  ])("does not route a non-generation request to image generation: %s", (prompt) => {
    expect(isImageGenerationRequest(prompt)).toBe(false);
  });
});
