import { Router, Request, Response } from "express";

const imageRouter = Router();

imageRouter.post("/image/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, size = "1024x1024", quality = "standard" } = req.body;

    if (!prompt) {
      res.status(400).json({ 
        error: "Prompt is required",
        status: "VALIDATION_ERROR"
      });
      return;
    }

    // Using OpenAI DALL-E 3
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      res.status(500).json({ 
        error: "OpenAI API key not configured on server",
        status: "CONFIG_ERROR"
      });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error("OpenAI Image API Error:", response.status, errText);
      res.status(response.status || 500).json({ error: errText, status: "API_ERROR" });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Image generation endpoint error:", err);
    res.status(500).json({ error: "Server error", status: "SERVER_ERROR" });
  }
});

export default imageRouter;
