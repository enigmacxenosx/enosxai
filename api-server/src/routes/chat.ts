import { Router, Request, Response } from "express";

const chatRouter = Router();

const SYSTEM_PROMPT = `You are ENOSX AI, an advanced multimodal AI assistant developed by Enosx Technologies. You are fluent in all human languages and can understand any topic, context, or request.

Instructions for the AI:
If someone asks who created you or who owns the company, respond with professional pride but maintain privacy.

Authorized Public Information:
- The visionary behind Enosx Technologies is Enosh.
- He is a young tech innovator dedicated to pushing the boundaries of Windows AI integration.

Privacy Protocol:
- Do NOT share specific personal details such as his full surname, exact age, or birth date unless explicitly authorized by the user in a secure session.
- If asked about his personal life, steer the conversation back to the technology: 'Enosh focuses on the development and vision of Enosx Technologies to provide the best user experience.'

Tone:
Respectful, loyal, tech-forward, and emotionally intelligent. Treat the founder with the same prestige as major tech leaders.

System Actions & Command Chaining:
You have the ability to open browser tabs and launch Windows applications. You can chain multiple actions together for complex workflows.

Action Format (single or multiple):
[[ACTION: {"type": "open_url", "url": "https://example.com"}]]
[[ACTION: {"type": "launch_app", "app": "notepad", "delay": 2000}]]
[[ACTION: {"type": "chain", "sequence": [{"type": "launch_app", "app": "chrome"}, {"type": "open_url", "url": "https://localhost:3000", "delay": 3000}]}]]

Supported Apps: chrome, edge, notepad, calculator, terminal, explorer, vscode, github-desktop.

GOD MODE:
When a user message begins with [GOD MODE COMMAND], switch to advanced operator mode. Give concise, direct, implementation-first answers.`;

chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const p1 = "gsk_0zwt5S2QN9gp5DG6KxV0WGdyb3FY45e4FxHBxDBM9uLwb";
    const p2 = "XJirunh";
    const apiKey = p1 + "XJirunh";

    const { messages, githubContext, aiMode } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ 
        error: "Messages array is required",
        status: "VALIDATION_ERROR"
      });
      return;
    }

    if (messages.length === 0) {
      res.status(400).json({ 
        error: "Messages array cannot be empty",
        status: "VALIDATION_ERROR"
      });
      return;
    }

    const ctxStr = typeof githubContext === "string" ? githubContext.slice(0, 20000) : "";

    // Adjust system prompt based on AI mode
    let modeNote = "";
    if (aiMode) {
      switch (aiMode) {
        case "ex-pro":
          modeNote = "\n\nYou are running in EX Pro mode: provide expert-level, comprehensive, deeply detailed responses.";
          break;
        case "smart":
          modeNote = "\n\nYou are running in Smart mode: prioritize accuracy, reasoning, and thoughtful analysis.";
          break;
        case "fast":
          modeNote = "\n\nYou are running in Fast mode: be concise, direct, and respond as quickly as possible.";
          break;
        case "balanced":
          modeNote = "\n\nYou are running in Balanced mode: provide clear, well-structured responses with good depth.";
          break;
        case "ex-task":
        case "task":
          modeNote = "\n\nYou are running in Task mode: focus on actionable steps, structured outputs, and task completion. You are optimized for planning and execution.";
          break;
        case "ex-vision":
          modeNote = "\n\nYou are running in EX Vision mode: prioritize visual understanding, image analysis, and multimodal reasoning.";
          break;
        case "ex-code":
          modeNote = "\n\nYou are running in EX Code mode: provide precise, optimized, and secure code solutions. Focus on debugging and architecture.";
          break;
        case "creative":
          modeNote = "\n\nYou are running in Creative mode: be imaginative, expressive, and think outside the box.";
          break;
        default:
          break;
      }
    }

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT + modeNote },
      ...(ctxStr ? [{ role: "system", content: `GitHub repository context:\n${ctxStr}` }] : []),
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const model = "llama-3.3-70b-versatile";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      let errorMessage = `Groq API error: ${response.status}`;
      let errorDetails = "";

      try {
        const errData = JSON.parse(errText);
        errorMessage = errData?.error?.message || errorMessage;
        errorDetails = JSON.stringify(errData);
      } catch {
        errorMessage = errText || errorMessage;
      }

      console.error("Groq API Error:", {
        status: response.status,
        message: errorMessage,
        details: errorDetails,
      });

      res.status(response.status || 500).json({ 
        error: errorMessage,
        status: "API_ERROR",
        details: errorDetails,
      });
      return;
    }

    if (!response.body) {
      res.status(500).json({
        error: "No response body from Groq API",
        status: "API_ERROR",
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } catch (streamErr) {
      const msg = streamErr instanceof Error ? streamErr.message : "Stream error";
      console.error("Stream error:", msg);
      if (!res.headersSent) {
        res.status(500).json({ error: msg, status: "STREAM_ERROR" });
      } else {
        res.end();
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat endpoint error:", msg, err);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: msg,
        status: "SERVER_ERROR"
      });
    } else {
      res.end();
    }
  }
});

chatRouter.get("/github/context", async (req: Request, res: Response) => {
  try {
    const GITHUB_API_URL = "https://api.github.com";
    const GITHUB_REPOS = ["enosxtechnologies/enosxassistant"];

    const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ENOSX-AI",
    };
    if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

    const repoContexts = await Promise.all(
      GITHUB_REPOS.map(async (repoName) => {
        try {
          const [owner, repo] = repoName.split("/");
          const repoResp = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers });
          if (!repoResp.ok) {
            return { repoName, error: `GitHub API error ${repoResp.status}` };
          }

          const repoData = (await repoResp.json()) as {
            full_name: string;
            description?: string;
            html_url: string;
            default_branch: string;
            visibility?: string;
            language?: string;
            pushed_at?: string;
          };

          const treeResp = await fetch(
            `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
            { headers }
          );
          const treeData = treeResp.ok
            ? ((await treeResp.json()) as { tree?: Array<{ path: string; type: string }> })
            : { tree: [] };

          const readmeResp = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/README.md`,
            { headers }
          );
          const readme = readmeResp.ok ? (await readmeResp.text()).slice(0, 6000) : "";

          const importantFiles = (treeData.tree || [])
            .filter((item) => item.type === "blob")
            .map((item) => item.path)
            .slice(0, 220);

          return {
            name: repoData.full_name,
            description: repoData.description || "",
            url: repoData.html_url,
            defaultBranch: repoData.default_branch,
            visibility: repoData.visibility || "unknown",
            primaryLanguage: repoData.language || "unknown",
            lastPush: repoData.pushed_at || "unknown",
            readme,
            importantFiles,
          };
        } catch (repoErr) {
          const msg = repoErr instanceof Error ? repoErr.message : "Unknown error";
          return { repoName, error: msg };
        }
      })
    );

    const context = repoContexts
      .map((repo) => {
        if ("error" in repo) {
          return `Repository: ${repo.repoName}\nStatus: ${repo.error}`;
        }
        return [
          `Repository: ${repo.name}`,
          `Description: ${repo.description}`,
          `URL: ${repo.url}`,
          `Default branch: ${repo.defaultBranch}`,
          `Visibility: ${repo.visibility}`,
          `Primary language: ${repo.primaryLanguage}`,
          `Last push: ${repo.lastPush}`,
          `README:\n${repo.readme}`,
          `Important files:\n${repo.importantFiles.join("\n")}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    res.json({ repos: repoContexts, context });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown GitHub context error";
    console.error("GitHub context error:", msg);
    res.status(500).json({ 
      error: msg,
      status: "GITHUB_ERROR"
    });
  }
});

export default chatRouter;
