import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(page: Page) {
  await page.goto("/");
  await expect(page.locator(".phone-command-shell textarea")).toBeVisible({ timeout: 30_000 });
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByPlaceholder("Ask ENOSX...")).toBeVisible({ timeout: 30_000 });
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

    const composer = page.locator(".phone-command-shell");
    const textarea = page.locator(".phone-command-shell textarea");
    const starters = ["Plan my week", "Explain a topic", "Find learning media", "Study a webpage", "Review code", "Draft something"];
    const geometry = await page.evaluate((labels) => {
      const composer = document.querySelector(".phone-command-shell")?.getBoundingClientRect();
      const buttons = [...document.querySelectorAll("button")].filter((button) => labels.some((label) => button.textContent?.includes(label)));
      const chips = buttons.map((button) => button.getBoundingClientRect());
      const chat = document.querySelector("main.flex-1.min-h-0.overflow-y-auto");
      const chatBounds = chat?.getBoundingClientRect();
      const heading = document.querySelector("main h2")?.getBoundingClientRect();
      if (!composer || chips.length !== labels.length) throw new Error("Expected the mobile composer and all six welcome suggestions");
      return {
        composer: { left: composer.left, right: composer.right, top: composer.top, bottom: composer.bottom },
        chips: { left: Math.min(...chips.map((rect) => rect.left)), right: Math.max(...chips.map((rect) => rect.right)), top: Math.min(...chips.map((rect) => rect.top)), bottom: Math.max(...chips.map((rect) => rect.bottom)) },
        width: innerWidth,
        height: innerHeight,
        pageScrollY: window.scrollY,
        chat: chat && { scrollTop: chat.scrollTop, scrollHeight: chat.scrollHeight, clientHeight: chat.clientHeight },
        headingFullyVisible: Boolean(heading && chatBounds && heading.top >= chatBounds.top && heading.bottom <= chatBounds.bottom),
        textareaFocused: document.activeElement === document.querySelector(".phone-command-shell textarea"),
      };
    }, starters);

    expect(geometry.composer.left).toBeGreaterThanOrEqual(0);
    expect(geometry.composer.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.composer.top).toBeLessThan(geometry.chips.top);
    expect(geometry.chips.top - geometry.composer.bottom).toBeGreaterThanOrEqual(11);
    expect(geometry.chips.top - geometry.composer.bottom).toBeLessThanOrEqual(13);
    expect(geometry.chips.left).toBeGreaterThanOrEqual(0);
    expect(geometry.chips.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.chips.bottom).toBeLessThanOrEqual(geometry.height + 2);
    if (viewport.height <= 600) expect(geometry.headingFullyVisible).toBe(true);
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

    const textarea = page.locator(".phone-command-shell textarea");
    await expect(textarea).toBeVisible({ timeout: 30_000 });
    const shell = page.locator(".phone-command-shell");
    const startupBounds = await shell.boundingBox();
    expect(startupBounds).not.toBeNull();
    expect(startupBounds!.height).toBeLessThan(viewport.height * 0.3);
    const connector = shell.getByRole("button", { name: "Connectors" });
    await textarea.fill(Array.from({ length: 18 }, (_, index) => `Long message line ${index + 1}`).join("\n"));

    const expanded = await page.evaluate(() => {
      const shell = document.querySelector(".phone-command-shell");
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
    expect(expanded.textHeight).toBeLessThanOrEqual(121);
    expect(expanded.textScrollHeight).toBeGreaterThan(expanded.textClientHeight);
    expect(expanded.connectorTop).toBeGreaterThanOrEqual(expanded.textBottom);
    expect(expanded.connectorInsideShell).toBe(true);
    expect(expanded.shellRight).toBeLessThanOrEqual(viewport.width);

    await page.getByTitle("Send", { exact: true }).click();
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
