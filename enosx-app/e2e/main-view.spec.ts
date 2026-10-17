import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(page: Page) {
  await page.goto("/");
  await expect(page.getByPlaceholder("Ask Enosx anything...")).toBeVisible({ timeout: 30_000 });
}

test("welcome view keeps the composer inside the viewport", async ({ page }) => {
  await openWorkspace(page);
  await expect(page.getByRole("region", { name: "Live monitoring dashboard" })).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const header = document.querySelector("main header")?.getBoundingClientRect();
    const composer = document.querySelector(".phone-command-shell")?.getBoundingClientRect();
    if (!header || !composer) throw new Error("Expected the chat header and composer to be rendered");
    return {
      headerBottom: header.bottom,
      composerTop: composer.top,
      composerLeft: composer.left,
      composerRight: composer.right,
      composerBottom: composer.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(geometry.headerBottom).toBeLessThanOrEqual(geometry.composerTop);
  expect(geometry.composerLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.composerRight).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.composerBottom).toBeLessThanOrEqual(geometry.viewportHeight + 2);
});

test("voice input shows a live waveform while listening", async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "en-US";
      maxAlternatives = 1;
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onresult: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      start() { this.onstart?.(new Event("start")); }
      stop() { this.onend?.(new Event("end")); }
      abort() { this.stop(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: MockSpeechRecognition });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => new MediaStream() },
    });
  });
  await openWorkspace(page);
  await page.locator('button[title="Voice input"]').click();
  await expect(page.getByTestId("voice-waveform-panel")).toBeVisible();
  await expect(page.getByTestId("voice-waveform")).toHaveAttribute("aria-label", "Live microphone audio waveform");
  await expect(page.locator('[data-testid="voice-waveform"] [data-waveform-bar="true"]')).toHaveCount(20);
  await page.locator('button[title="Stop listening"]').click();
  await expect(page.getByTestId("voice-waveform-panel")).toHaveCount(0);
});

test("composer remains inside the viewport at a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  const geometry = await page.evaluate(() => {
    const composer = document.querySelector(".phone-command-shell")?.getBoundingClientRect();
    if (!composer) throw new Error("Expected the composer to be rendered");
    return { left: composer.left, right: composer.right, bottom: composer.bottom, width: window.innerWidth, height: window.innerHeight };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 8);
});
