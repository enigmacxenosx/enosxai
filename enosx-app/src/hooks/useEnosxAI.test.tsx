import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEnosxAI } from "./useEnosxAI";

vi.mock("@/lib/localModels", () => ({
  chatWithLocalModel: vi.fn(),
  isDesktopShell: () => false,
  readLocalModelSettings: () => ({ enabled: false, model: "", baseUrl: "" }),
}));
vi.mock("@/lib/errorReporting", () => ({ reportClientError: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEnosxAI streaming failures", () => {
  it("reports an error separately when the stream fails after partial text", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Here are random videos"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"error":{"message":"upstream connection reset"}}\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, { status: 200 })));
    const chunks: string[] = [];
    const completions: Array<{ success: boolean; error?: string } | undefined> = [];
    const { result } = renderHook(() => useEnosxAI());

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user", role: "user", content: "Find videos" } as any],
        (chunk) => chunks.push(chunk),
        (completion) => completions.push(completion),
      );
    });

    expect(chunks).toEqual(["Here are random videos"]);
    expect(chunks.join("")).not.toContain("connecting");
    expect(completions).toHaveLength(1);
    expect(completions[0]?.success).toBe(false);
    expect(completions[0]?.error).toMatch(/trouble connecting/i);
    expect(result.current.error).toMatch(/trouble connecting/i);
  });
});
