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

test("desktop welcome composer rises into the open space above its suggestions", async ({ page }) => {
  await page.setViewportSize({ width: 1274, height: 619 });
  await openWorkspace(page);
  const geometry = await page.evaluate(() => {
    const composer = document.querySelector(".phone-command-shell")?.getBoundingClientRect();
    const labels = ["Plan my week", "Explain a topic", "Find learning media", "Study a webpage", "Review code", "Draft something"];
    const chips = [...document.querySelectorAll("button")]
      .filter((button) => labels.some((label) => button.textContent?.includes(label)))
      .map((button) => button.getBoundingClientRect());
    if (!composer || chips.length !== labels.length) throw new Error("Expected the desktop composer and all six welcome suggestions");
    return {
      composerTop: composer.top,
      composerBottom: composer.bottom,
      chipsTop: Math.min(...chips.map((rect) => rect.top)),
      chipsBottom: Math.max(...chips.map((rect) => rect.bottom)),
      viewportHeight: innerHeight,
    };
  });
  expect(geometry.composerTop).toBeLessThan(390);
  expect(geometry.chipsTop).toBeGreaterThan(geometry.composerBottom);
  expect(geometry.chipsBottom).toBeLessThanOrEqual(geometry.viewportHeight + 2);
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

test("mobile welcome suggestions sit below the composer without stealing focus or scrolling the page", async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 390, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await openWorkspace(page);

    const composer = page.locator(".phone-command-shell");
    const textarea = page.getByPlaceholder("Ask Enosx anything...");
    const starters = ["Plan my week", "Explain a topic", "Find learning media", "Study a webpage", "Review code", "Draft something"];
    const geometry = await page.evaluate((labels) => {
      const composer = document.querySelector(".phone-command-shell")?.getBoundingClientRect();
      const buttons = [...document.querySelectorAll("button")].filter((button) => labels.some((label) => button.textContent?.includes(label)));
      const chips = buttons.map((button) => button.getBoundingClientRect());
      const chat = document.querySelector("main.flex-1.min-h-0.overflow-y-auto");
      if (!composer || chips.length !== labels.length) throw new Error("Expected the mobile composer and all six welcome suggestions");
      return {
        composer: { left: composer.left, right: composer.right, top: composer.top, bottom: composer.bottom },
        chips: { left: Math.min(...chips.map((rect) => rect.left)), right: Math.max(...chips.map((rect) => rect.right)), top: Math.min(...chips.map((rect) => rect.top)), bottom: Math.max(...chips.map((rect) => rect.bottom)) },
        width: innerWidth,
        height: innerHeight,
        pageScrollY: window.scrollY,
        chat: chat && { scrollTop: chat.scrollTop, scrollHeight: chat.scrollHeight, clientHeight: chat.clientHeight },
        textareaFocused: document.activeElement === document.querySelector(".phone-command-shell textarea"),
      };
    }, starters);

    expect(geometry.composer.left).toBeGreaterThanOrEqual(0);
    expect(geometry.composer.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.composer.top).toBeLessThan(geometry.chips.top);
    expect(geometry.chips.left).toBeGreaterThanOrEqual(0);
    expect(geometry.chips.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.chips.bottom).toBeLessThanOrEqual(geometry.height + 2);
    expect(geometry.pageScrollY).toBe(0);
    expect(geometry.textareaFocused).toBe(false);

    await textarea.click();
    await expect(textarea).toBeFocused();
    if (geometry.chat) {
      await page.locator("main.flex-1.min-h-0.overflow-y-auto").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    }
  }
});
