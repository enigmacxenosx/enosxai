import { expect, test } from "@playwright/test";

test("assistant replies offer follow-ups, star ratings, and independent conversation branches", async ({ page }) => {
  const timestamp = "2026-11-19T10:00:00.000Z";
  await page.addInitScript((createdAt) => {
    const conversation = {
      id: "feature-test-chat",
      title: "Feature test",
      createdAt,
      updatedAt: createdAt,
      messages: [
        { id: "user-1", role: "user", content: "Explain how to deploy an app", timestamp: createdAt },
        { id: "assistant-1", role: "assistant", content: "Here are the deployment steps.", timestamp: createdAt },
        { id: "user-2", role: "user", content: "What about rollback?", timestamp: createdAt },
        { id: "assistant-2", role: "assistant", content: "Keep the previous release ready for rollback.", timestamp: createdAt },
      ],
    };
    localStorage.setItem("enosx_chats_guest", JSON.stringify([conversation]));
    localStorage.setItem("enosx_active_chat_guest", conversation.id);
  }, timestamp);
  await page.route("**/api/error-report", (route) => route.abort());
  await page.route("**/api/feedback", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.route("**/api/chat", (route) => route.fulfill({
    status: 200,
    contentType: "text/event-stream",
    body: 'data: {"choices":[{"delta":{"content":"Branch follow-up answer"}}]}\n\n',
  }));

  await page.goto("/");
  await expect(page.getByText("Keep the previous release ready for rollback.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Suggested next prompts")).toBeVisible();
  await expect(page.getByRole("button", { name: "What would be a useful next step?" })).toBeVisible();

  await page.getByRole("group", { name: "Rate this response from 1 to 5 stars" }).last().getByRole("button", { name: "4 stars" }).click();
  await expect(page.getByText("Thanks for rating this response.")).toBeVisible();
  const feedback = JSON.parse(await page.evaluate(() => localStorage.getItem("enosx_feedback_records") || "{}"));
  expect(feedback["assistant-2"].rating).toBe(4);

  await page.getByRole("button", { name: "Branch conversation from this reply" }).last().click();
  await expect(page.getByRole("heading", { name: "Branch: Feature test" })).toBeVisible();
  await expect(page.getByText("Keep the previous release ready for rollback.")).toBeVisible();
  await expect(page.getByText("What about rollback?")).toBeVisible();

  await page.locator(".enosx-composer textarea").fill("Continue from this branch");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Branch follow-up answer")).toBeVisible({ timeout: 10_000 });

  const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("enosx_chats_guest") || "[]"));
  expect(stored).toHaveLength(2);
  const branch = stored.find((conversation: { branchOf?: { conversationId: string; messageId: string } }) => conversation.branchOf);
  const original = stored.find((conversation: { id: string }) => conversation.id === "feature-test-chat");
  expect(branch.branchOf).toEqual({ conversationId: "feature-test-chat", messageId: "assistant-2" });
  expect(branch.messages.map((message: { id: string }) => message.id)).toEqual(["user-1", "assistant-1", "user-2", "assistant-2", expect.any(String), expect.any(String)]);
  expect(original.messages).toHaveLength(4);
});
