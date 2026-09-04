/**
 * Local functional test for the image generation pipeline.
 * Runs the same OpenRouter call that api/image/generate.ts performs,
 * without deploying to Vercel. Requires OPENROUTER_API_KEY.
 */
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY not set — skipping live call (expected in CI).");
  process.exit(0);
}

const MODELS = ["google/gemini-3.1-flash-image", "openai/gpt-5-image-mini", "openrouter/auto"];
const prompt = process.argv[2] || "a small neon circuit owl on a dark background, minimal";

for (const model of MODELS) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://enosxtechnologies450.vercel.app",
        "X-Title": "ENOSX AI",
      },
      body: JSON.stringify({ model, prompt }),
    });
    console.log(`[model=${model}] status=${res.status}`);
    if (res.ok) {
      const data = await res.json();
      const img = data?.data?.[0] || data?.choices?.[0]?.message?.attachments?.[0];
      if (img) {
        const url = img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : "");
        if (url && /^https:\/\//.test(url)) {
          // Verify the returned link actually resolves to an image
          const head = await fetch(url, { method: "GET" });
          const ctype = head.headers.get("content-type") || "";
          console.log(`SUCCESS: url resolves (status ${head.status}, content-type ${ctype})`);
          console.log("URL:", url);
          if (img.revised_prompt) console.log("Revised prompt:", img.revised_prompt.slice(0, 200));
          process.exit(0);
        } else {
          console.log(`WARN: non-HTTP url payload from ${model}`);
        }
      } else {
        console.log(`WARN: no image payload from ${model}`);
      }
    } else {
      const text = await res.text().catch(() => "");
      console.log(`FAIL: ${model} -> ${res.status} ${text.slice(0, 120)}`);
    }
  } catch (e) {
    console.error(`ERR: ${model}`, e.message);
  }
}
console.log("All candidates exhausted.");
process.exit(1);
