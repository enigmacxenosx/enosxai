import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiKeyRotator,
  FAST_PATH_FALLBACK_MODEL,
  MAIN_SUPERVISOR_MODEL,
  SPECIALIST_MODELS,
  SYNTHESIS_FALLBACK_MODEL,
  normalizeNvidiaApiBase,
  parseNvidiaApiKeys,
  runLiveWebSearch,
  runNemotronOrchestrator,
} from "./nemotron-orchestrator.ts";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function completion(content: string, toolCalls?: unknown[]) {
  return jsonResponse({
    choices: [{ message: { content, ...(toolCalls ? { tool_calls: toolCalls } : {}) } }],
  });
}

function delegate(task: string, specialistIds: string[]) {
  return {
    id: `call_${task}`,
    type: "function",
    function: {
      name: "delegate_subtask",
      arguments: JSON.stringify({ task, specialist_ids: specialistIds }),
    },
  };
}

const baseMessages = [{ role: "user" as const, content: "Explain how to debug this TypeScript API." }];

test("registry contains 34 typed NVIDIA catalog entries", () => {
  assert.equal(Object.keys(SPECIALIST_MODELS).length, 34);
  assert.ok(Object.values(SPECIALIST_MODELS).every((model) => model.model && model.interface && model.expertise));
  assert.equal(normalizeNvidiaApiBase("https://nvidia.com"), "https://integrate.api.nvidia.com/v1");
});

test("NVIDIA key parsing deduplicates values and the rotator cycles", () => {
  const keys = parseNvidiaApiKeys({ NVIDIA_API_KEYS: "key-a,key-b key-a", NVIDIA_API_KEY: "key-c" });
  assert.deepEqual(keys, ["key-a", "key-b", "key-c"]);
  const rotator = new ApiKeyRotator(keys);
  assert.deepEqual(Array.from({ length: 5 }, () => rotator.next()), ["key-a", "key-b", "key-c", "key-a", "key-b"]);
});

test("simple conversational prompts use one streaming fast-path call", async () => {
  const recorded: any[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    recorded.push(body);
    return new Response([
      "data: {\"choices\":[{\"delta\":{\"content\":\"Hello from ENOSX.\"}}]}\n\n",
      "data: [DONE]\n\n",
    ].join(""), { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };

  const answer = await runNemotronOrchestrator({
    messages: [{ role: "user", content: "hello" }],
    systemContent: "Test system",
    aiMode: "ex-core",
    env: { NVIDIA_API_KEY: "key-one" },
    fetchImpl,
  });

  assert.equal(answer, "Hello from ENOSX.");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].model, MAIN_SUPERVISOR_MODEL);
  assert.equal(recorded[0].stream, true);
});

test("simple fast path falls back to Nemotron Lightning when the primary fails", async () => {
  const models: string[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    models.push(body.model);
    if (body.model === MAIN_SUPERVISOR_MODEL) return jsonResponse({ error: "primary unavailable" }, 503);
    return new Response("data: {\"choices\":[{\"delta\":{\"content\":\"Fallback hello.\"}}]}\n\ndata: [DONE]\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  const answer = await runNemotronOrchestrator({
    messages: [{ role: "user", content: "tell me about your capabilities" }],
    systemContent: "Test system",
    aiMode: "ex-core",
    env: { NVIDIA_API_KEYS: "key-one,key-two" },
    fetchImpl,
  });

  assert.equal(answer, "Fallback hello.");
  assert.deepEqual(models, [MAIN_SUPERVISOR_MODEL, FAST_PATH_FALLBACK_MODEL]);
});

test("supervisor routing is parallel, capped at three subtasks and three specialists each", async () => {
  const plans = [
    delegate("code review", ["fast_code_patcher", "frontier_escalation", "edge_local_logic", "ultra_light_triage"]),
    delegate("reasoning check", ["fast_reasoning_alt", "general_data_analyst", "step_reasoning_helper"]),
    delegate("independent review", ["creative_dialogue_writer", "neural_machine_translator", "chart_diagram_analyst"]),
    delegate("must be ignored", ["ultra_light_triage"]),
  ];
  const recorded: Array<{ model: string; body: any; authorization: string | null }> = [];
  let activeWorkers = 0;
  let maxActiveWorkers = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    recorded.push({ model: body.model, body, authorization: new Headers(init?.headers).get("Authorization") });
    if (body.model === MAIN_SUPERVISOR_MODEL && body.max_tokens === 1400) return completion("", plans);
    if (body.model === MAIN_SUPERVISOR_MODEL) return completion("Synthesized answer");
    activeWorkers += 1;
    maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
    await new Promise((resolve) => setTimeout(resolve, 10));
    activeWorkers -= 1;
    if (body.model === SPECIALIST_MODELS.fast_reasoning_alt.model) return jsonResponse({ error: "mock worker error" }, 503);
    return completion(`Finding from ${body.model}`);
  };

  const answer = await runNemotronOrchestrator({
    messages: baseMessages,
    systemContent: "Test system",
    aiMode: "enosh-mind",
    env: { NVIDIA_API_KEYS: "key-a,key-b,key-c" },
    fetchImpl,
  });

  const workers = recorded.filter((call) => call.model !== MAIN_SUPERVISOR_MODEL);
  assert.equal(workers.length, 9);
  assert.ok(maxActiveWorkers > 1, "workers should be in flight concurrently");
  assert.ok(answer.includes("Synthesized answer"));
  assert.equal(recorded[0].authorization, "Bearer key-a");
  assert.equal(workers[0].authorization, "Bearer key-b");
  assert.equal(recorded.filter((call) => call.body.tool_choice === "none" && call.body.max_tokens === 8192).length, 1);
  const synthesis = recorded.find((call) => call.model === MAIN_SUPERVISOR_MODEL && call.body.max_tokens === 8192);
  assert.equal(synthesis?.body.tool_choice, "none");
  assert.equal(synthesis?.body.max_tokens, 8192);
});

test("empty primary synthesis falls back to Mistral with no tools and 8192 tokens", async () => {
  const recorded: Array<{ model: string; body: any }> = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    recorded.push({ model: body.model, body });
    if (body.model === MAIN_SUPERVISOR_MODEL && body.max_tokens === 1400) return completion("", []);
    if (body.model === MAIN_SUPERVISOR_MODEL) return completion("   ");
    if (body.model === SYNTHESIS_FALLBACK_MODEL) return completion("Mistral fallback answer");
    return completion("One specialist finding");
  };

  const answer = await runNemotronOrchestrator({
    messages: [{ role: "user", content: "What is 2 plus 2?" }],
    systemContent: "Test system",
    aiMode: "ex-core",
    env: { NVIDIA_API_KEY: "key-one" },
    fetchImpl,
  });

  assert.equal(answer, "Mistral fallback answer");
  const fallback = recorded.find((call) => call.model === SYNTHESIS_FALLBACK_MODEL);
  assert.ok(fallback);
  assert.equal(fallback.body.tool_choice, "none");
  assert.equal(fallback.body.max_tokens, 8192);
});

test("live search falls back from Tavily and Google News to keyless DuckDuckGo", async () => {
  const visited: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    visited.push(url);
    if (url.includes("api.tavily.com")) return jsonResponse({ error: "mock unavailable" }, 503);
    if (url.includes("news.google.com")) return new Response("unavailable", { status: 503 });
    if (url.includes("api.duckduckgo.com")) return jsonResponse({
      Heading: "Current result",
      AbstractText: "A mock keyless result.",
      AbstractURL: "https://example.com/result",
      RelatedTopics: [],
    });
    throw new Error(`Unexpected URL ${url}`);
  };

  const result = await runLiveWebSearch("current test information", {
    env: { TAVILY_API_KEY: "tavily-test-key" },
    fetchImpl,
    remainingMs: 5_000,
  });

  assert.equal(result.provider, "DuckDuckGo Instant Answer");
  assert.equal(result.results[0].url, "https://example.com/result");
  assert.deepEqual(visited.map((url) => new URL(url).hostname), ["api.tavily.com", "news.google.com", "api.duckduckgo.com"]);
});

test("provider body reads remain inside the request timeout and still return non-empty fallback text", async () => {
  let providerSignal: AbortSignal | undefined;
  const fetchImpl: typeof fetch = async (_input, init) => {
    providerSignal = init?.signal as AbortSignal;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        providerSignal?.addEventListener("abort", () => controller.error(new Error("mock body timeout")), { once: true });
      },
    }), { headers: { "Content-Type": "application/json" } });
  };

  const answer = await Promise.race([
    runNemotronOrchestrator({
      messages: [{ role: "user", content: "A short request." }],
      systemContent: "Test system",
      aiMode: "ex-core",
      env: { NVIDIA_API_KEY: "key-one" },
      fetchImpl,
      maxDurationMs: 35,
    }),
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("orchestrator did not enforce the request timeout")), 250)),
  ]);

  assert.ok(providerSignal?.aborted, "the response-body read should be aborted with the provider request");
  assert.ok(answer.trim().length > 0);
});
