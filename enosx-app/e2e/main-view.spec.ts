import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(page: Page) {
  await page.goto("/");
  await expect(page.locator(".enosx-composer textarea")).toBeVisible({ timeout: 30_000 });
}

test("welcome view keeps the composer inside the viewport", async ({ page }) => {
  await openWorkspace(page);
  await expect(page.getByRole("region", { name: "Live monitoring dashboard" })).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const header = document.querySelector("main header")?.getBoundingClientRect();
    const composer = document.querySelector(".enosx-composer")?.getBoundingClientRect();
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

test("composer placeholder personalizes on desktop and stays compact on mobile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("enosx-guest-profile", JSON.stringify({
      id: "guest-test-user",
      email: "",
      displayName: "Maya Chen",
      provider: "guest",
    }));
  });
  await page.goto("/");
  await expect(page.getByPlaceholder("What can I help you with, Maya?")).toBeVisible({ timeout: 30_000 });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.reload();
  await expect(page.getByPlaceholder("Ask…")).toBeVisible({ timeout: 30_000 });
});

test("desktop welcome composer rises into the open space above its suggestions", async ({ page }) => {
  await page.setViewportSize({ width: 1274, height: 619 });
  await openWorkspace(page);
  const geometry = await page.evaluate(() => {
    const composer = document.querySelector(".enosx-composer")?.getBoundingClientRect();
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
  expect(geometry.chipsTop - geometry.composerBottom).toBeGreaterThanOrEqual(15);
  expect(geometry.chipsTop - geometry.composerBottom).toBeLessThanOrEqual(17);
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
    const composer = document.querySelector(".enosx-composer")?.getBoundingClientRect();
    if (!composer) throw new Error("Expected the composer to be rendered");
    return { left: composer.left, right: composer.right, bottom: composer.bottom, width: window.innerWidth, height: window.innerHeight };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 8);
});

test("mobile welcome suggestions sit above the composer and scroll horizontally without moving the page", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 390, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await openWorkspace(page);

    if (viewport.height <= 600) {
      await page.waitForFunction(() => {
        const chat = document.querySelector("main.flex-1.min-h-0.overflow-y-auto");
        const heading = document.querySelector("main h2");
        if (!chat || !heading) return false;
        const chatBounds = chat.getBoundingClientRect();
        const headingBounds = heading.getBoundingClientRect();
        return headingBounds.top >= chatBounds.top && headingBounds.bottom <= chatBounds.bottom;
      }, null, { timeout: 3000 });
    }

    const composer = page.locator(".enosx-composer");
    const textarea = page.locator(".enosx-composer textarea");
    const suggestionRow = page.locator(".phone-welcome-suggestions .welcome-suggestions");
    const starters = ["Plan my week", "Explain a topic", "Find learning media", "Study a webpage", "Review code", "Draft something"];
    const geometry = await page.evaluate((labels) => {
      const composer = document.querySelector(".enosx-composer")?.getBoundingClientRect();
      const suggestionRow = document.querySelector(".phone-welcome-suggestions .welcome-suggestions");
      const suggestionBounds = suggestionRow?.getBoundingClientRect();
      const buttons = [...document.querySelectorAll("button")].filter((button) => labels.some((label) => button.textContent?.includes(label)));
      const chat = document.querySelector("main.flex-1.min-h-0.overflow-y-auto");
      const chatBounds = chat?.getBoundingClientRect();
      const heading = document.querySelector("main h2")?.getBoundingClientRect();
      if (!composer || !suggestionRow || !suggestionBounds || buttons.length !== labels.length) throw new Error("Expected the mobile composer and all six welcome suggestions");
      return {
        composer: { left: composer.left, right: composer.right, top: composer.top, bottom: composer.bottom },
        suggestionRow: { left: suggestionBounds.left, right: suggestionBounds.right, top: suggestionBounds.top, bottom: suggestionBounds.bottom, scrollWidth: suggestionRow.scrollWidth, clientWidth: suggestionRow.clientWidth },
        width: innerWidth,
        height: innerHeight,
        pageScrollY: window.scrollY,
        chat: chat && { scrollTop: chat.scrollTop, scrollHeight: chat.scrollHeight, clientHeight: chat.clientHeight },
        headingFullyVisible: Boolean(heading && chatBounds && heading.top >= chatBounds.top && heading.bottom <= chatBounds.bottom),
        textareaFocused: document.activeElement === document.querySelector(".enosx-composer textarea"),
      };
    }, starters);

    expect(geometry.composer.left).toBeGreaterThanOrEqual(0);
    expect(geometry.composer.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.suggestionRow.bottom).toBeLessThan(geometry.composer.top);
    expect(geometry.suggestionRow.left).toBeGreaterThanOrEqual(0);
    expect(geometry.suggestionRow.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.suggestionRow.bottom).toBeLessThanOrEqual(geometry.height + 2);
    expect(geometry.suggestionRow.scrollWidth).toBeGreaterThan(geometry.suggestionRow.clientWidth);
    if (viewport.height <= 600) expect(geometry.headingFullyVisible).toBe(true);
    expect(geometry.pageScrollY).toBe(0);
    expect(geometry.textareaFocused).toBe(false);

    await suggestionRow.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await expect(page.getByRole("button", { name: /Draft something/ })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
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

test("mobile composer returns to startup size after sending and keeps connector picker in view", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.route("**/api/chat", (route) => route.abort());
    await page.route("**/api/error-report", (route) => route.abort());

    const textarea = page.locator(".enosx-composer textarea");
    await expect(textarea).toBeVisible({ timeout: 30_000 });
    const shell = page.locator(".enosx-composer");
    const startupBounds = await shell.boundingBox();
    expect(startupBounds).not.toBeNull();
    expect(startupBounds!.height).toBeLessThan(viewport.height * 0.3);
    const connector = shell.getByRole("button", { name: "Connectors" });
    await textarea.fill(Array.from({ length: 18 }, (_, index) => `Long message line ${index + 1}`).join("\n"));

    const expanded = await page.evaluate(() => {
      const shell = document.querySelector(".enosx-composer");
      const textarea = shell?.querySelector("textarea");
      const connector = shell?.querySelector('button[aria-label="Connectors"]');
      if (!shell || !textarea || !connector) throw new Error("Composer elements were not found");
      const textRect = textarea.getBoundingClientRect();
      const connectorRect = connector.getBoundingClientRect();
      return {
        textHeight: textRect.height,
        textScrollHeight: textarea.scrollHeight,
        textClientHeight: textarea.clientHeight,
        connectorTop: connectorRect.top,
        textBottom: textRect.bottom,
        connectorInsideShell: shell.contains(connector),
        shellRight: shell.getBoundingClientRect().right,
      };
    });
    expect(expanded.textHeight).toBeLessThanOrEqual(40);
    expect(expanded.textScrollHeight).toBeGreaterThan(expanded.textClientHeight);
    expect(expanded.connectorTop).toBeGreaterThanOrEqual(expanded.textBottom);
    expect(expanded.connectorInsideShell).toBe(true);
    expect(expanded.shellRight).toBeLessThanOrEqual(viewport.width);
    const whileDraftingBounds = await shell.boundingBox();
    expect(whileDraftingBounds).not.toBeNull();
    expect(whileDraftingBounds!.height).toBeLessThanOrEqual(startupBounds!.height + 2);

    await page.getByRole("button", { name: "Send message" }).click();
    await expect(textarea).toHaveValue("");
    await expect.poll(() => textarea.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(40);
    const afterSendBounds = await shell.boundingBox();
    expect(afterSendBounds).not.toBeNull();
    expect(afterSendBounds!.height).toBeLessThanOrEqual(startupBounds!.height + 2);

    await connector.click();
    const picker = page.getByRole("dialog", { name: "Connector picker" });
    await expect(picker).toBeVisible();
    const pickerBounds = await picker.boundingBox();
    expect(pickerBounds).not.toBeNull();
    expect(pickerBounds!.x).toBeGreaterThanOrEqual(0);
    expect(pickerBounds!.x + pickerBounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(pickerBounds!.y).toBeGreaterThanOrEqual(0);
    expect(pickerBounds!.y + pickerBounds!.height).toBeLessThanOrEqual(viewport.height);
    await picker.getByRole("button", { name: "Close connector picker" }).click();
  }
});

test("composer keeps its size while an AI reply is active and another message is queued", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let requestCount = 0;
  let releaseFirstRequest: () => void = () => {};
  const firstRequestHeld = new Promise<void>((resolve) => { releaseFirstRequest = resolve; });

  await page.route("**/api/chat", async (route) => {
    requestCount += 1;
    if (requestCount === 1) await firstRequestHeld;
    await route.abort();
  });
  await page.route("**/api/error-report", (route) => route.abort());
  await openWorkspace(page);

  const shell = page.locator(".enosx-composer");
  const textarea = shell.locator("textarea");
  await textarea.fill("First message");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => requestCount).toBe(1);

  const replyingBounds = await shell.boundingBox();
  expect(replyingBounds).not.toBeNull();

  await textarea.fill("Next message while replying");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status").filter({ hasText: "waiting message" })).toContainText("1 waiting message queued");

  const queuedBounds = await shell.boundingBox();
  expect(queuedBounds).not.toBeNull();
  expect(queuedBounds!.height).toBeLessThanOrEqual(replyingBounds!.height + 2);

  releaseFirstRequest();
  await expect.poll(() => requestCount).toBe(2);
});

test("plugins catalog opens quickly and shows the custom asset bundle plugin", async ({ page }) => {
  await openWorkspace(page);
  const startedAt = Date.now();
  await page.getByRole("button", { name: "Plugins" }).click();
  const dialog = page.getByRole("dialog", { name: "Plugins" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Asset Bundle Plugin" })).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(1_500);
  await expect(dialog.getByRole("button", { name: "Copy prompt" }).last()).toBeEnabled();
  await dialog.getByRole("button", { name: "Close plugins" }).click();
  await expect(dialog).toHaveCount(0);
});
