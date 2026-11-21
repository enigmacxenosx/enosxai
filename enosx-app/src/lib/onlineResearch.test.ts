import { afterEach, describe, expect, it, vi } from "vitest";
import { getOnlineMediaSearch, searchOnlineMedia } from "./onlineResearch";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getOnlineMediaSearch", () => {
  it("detects combined online picture and video requests", () => {
    expect(getOnlineMediaSearch("Show me online pictures and videos of the Northern Lights")).toEqual({
      type: "both",
      query: "pictures of the Northern Lights",
    });
  });

  it("does not mistake direct image creation for online search", () => {
    expect(getOnlineMediaSearch("Generate an image of a red fox")).toBeNull();
  });

  it("searches online for a requested Jerusalem Cross picture", () => {
    expect(getOnlineMediaSearch("Can you show me a picture of the Jerusalem Cross?")).toEqual({
      type: "images",
      query: "picture of the Jerusalem Cross",
    });
  });

  it("routes a general music request to playable video search", () => {
    expect(getOnlineMediaSearch("Play some music")).toEqual({
      type: "music",
      query: "popular music",
    });
  });

  it("preserves a requested track and artist in a music search", () => {
    expect(getOnlineMediaSearch("Play Here Comes the Sun by The Beatles")).toEqual({
      type: "music",
      query: "Here Comes the Sun by The Beatles",
    });
  });

  it("does not search when the user is only asking about music", () => {
    expect(getOnlineMediaSearch("Explain music theory")).toBeNull();
  });

  it("detects online music track searches", () => {
    expect(getOnlineMediaSearch("Find online music tracks by Enya")).toEqual({
      type: "music",
      query: "Enya",
    });
  });

  it("searches videos and music together", () => {
    expect(getOnlineMediaSearch("Search for online videos and songs about space")).toEqual({
      type: "videos-and-music",
      query: "about space",
    });
  });
});

describe("searchOnlineMedia", () => {
  it("formats real image URLs as inline markdown and video URLs as links", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ title: "Aurora video", url: "https://www.youtube.com/watch?v=abcdefghijk", source: "youtube.com" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ title: "Aurora", imageUrl: "https://images.example/aurora.jpg", url: "https://example.com/aurora", source: "example.com" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchOnlineMedia({ type: "both", query: "aurora" });

    expect(result.issue).toBeNull();
    expect(result.context).toContain("![Aurora](https://images.example/aurora.jpg)");
    expect(result.context).toContain("[Source: Aurora — example.com](https://example.com/aurora)");
    expect(result.context).toContain("[Aurora video — youtube.com](https://www.youtube.com/watch?v=abcdefghijk)");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports unavailable search without inventing results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "not configured" }), { status: 503 })));

    const result = await searchOnlineMedia({ type: "videos", query: "aurora" });

    expect(result.context).toBe("");
    expect(result.issue).toMatch(/unavailable|not configured/i);
  });

  it("labels music searches distinctly and keeps the source URL for inline playback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [{ title: "Here Comes the Sun — official video", url: "https://www.youtube.com/watch?v=abcdefghijk", source: "youtube.com" }],
    }), { status: 200 })));

    const result = await searchOnlineMedia({ type: "videos", query: "Here Comes the Sun", purpose: "music" });

    expect(result.context).toContain("### Online music video results");
    expect(result.context).toContain("https://www.youtube.com/watch?v=abcdefghijk");
  });

  it("reports an empty search result distinctly from a provider failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 })));

    const result = await searchOnlineMedia({ type: "images", query: "aurora" });

    expect(result.context).toBe("");
    expect(result.issue).toContain("returned no images");
  });

  it("formats music results as inline audio previews with source links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [{ title: "Only Time", url: "https://open.spotify.com/track/0123456789abcdef", source: "spotify.com" }],
    }), { status: 200 })));

    const result = await searchOnlineMedia({ type: "music", query: "Only Time Enya" });

    expect(result.issue).toBeNull();
    expect(result.context).toContain("### Online music track results");
    expect(result.context).toContain("[Audio preview: Only Time](https://open.spotify.com/track/0123456789abcdef)");
    expect(result.context).toContain("[Source: Only Time — spotify.com](https://open.spotify.com/track/0123456789abcdef)");
  });
});
