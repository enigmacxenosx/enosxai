import { expect, test, type Page } from "@playwright/test";

async function openThemePicker(page: Page) {
  const picker = page.getByTitle("Change theme");
  if (!(await picker.isVisible())) {
    const mobileSidebarButton = page.getByRole("button", { name: "Open sidebar" });
    if (await mobileSidebarButton.isVisible()) {
      await mobileSidebarButton.click();
    } else {
      await page.getByTitle("Expand sidebar").click();
    }
  }
  await expect(picker).toBeVisible();
  await picker.click();
}

test("light and dark themes switch smoothly and persist across reloads", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("enosx-theme") === null) localStorage.setItem("enosx-theme", "dark");
  });
  await page.goto("/");
  await expect(page.locator(".enosx-composer textarea")).toBeVisible({ timeout: 30_000 });
  await openThemePicker(page);
  await page.getByRole("button", { name: "Light" }).click();

  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("enosx-theme"))).toBe("light");
  const transition = await page.evaluate(() => ({
    active: document.documentElement.classList.contains("theme-transitioning"),
    duration: getComputedStyle(document.documentElement).transitionDuration,
    colorScheme: document.documentElement.style.colorScheme,
  }));
  expect(transition.active).toBe(true);
  const durationMs = transition.duration.endsWith("ms")
    ? Number.parseFloat(transition.duration)
    : Number.parseFloat(transition.duration) * 1000;
  expect(durationMs).toBeCloseTo(280, 0);
  expect(transition.colorScheme).toBe("light");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.colorScheme)).toBe("light");
});

test("theme switching honors reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (localStorage.getItem("enosx-theme") === null) localStorage.setItem("enosx-theme", "dark");
  });
  await page.goto("/");
  await expect(page.locator(".enosx-composer textarea")).toBeVisible({ timeout: 30_000 });
  await openThemePicker(page);
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  expect(await page.locator("html").evaluate((element) => element.classList.contains("theme-transitioning"))).toBe(false);
});
