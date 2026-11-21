import { describe, expect, it } from "vitest";
import { isImageUrl, resolveMediaUrl } from "./mediaUrls";

describe("resolveMediaUrl", () => {
  it.each([
    ["https://cdn.example.test/song.mp3", "audio"],
    ["https://cdn.example.test/audio?mime=audio%2Fmpeg", "audio"],
    ["https://cdn.example.test/video.mp4", "video"],
  ] as const)("classifies direct media URL %s as %s", (url, type) => {
    expect(resolveMediaUrl(url)?.type).toBe(type);
  });

  it("creates inline previews for Spotify tracks and SoundCloud tracks", () => {
    const spotify = resolveMediaUrl("https://open.spotify.com/track/0123456789abcdef");
    expect(spotify).toMatchObject({ type: "audio", embedded: true, src: "https://open.spotify.com/embed/track/0123456789abcdef" });

    const soundcloud = resolveMediaUrl("https://soundcloud.com/artist/example-track");
    expect(soundcloud?.type).toBe("audio");
    expect(soundcloud?.embedded).toBe(true);
    expect(soundcloud?.src).toContain("https://w.soundcloud.com/player/");
  });

  it("keeps video providers embeddable and rejects unsafe URL schemes", () => {
    expect(resolveMediaUrl("https://youtu.be/abcdefghijk")?.type).toBe("embed");
    expect(resolveMediaUrl("https://cdn.example.test/music-video.mp4", false, true, true)?.type).toBe("video");
    expect(resolveMediaUrl("javascript:alert(1)")).toBeNull();
  });

  it("continues to identify supported image URLs", () => {
    expect(isImageUrl("https://images.unsplash.com/photo.jpg")).toBe(true);
    expect(isImageUrl("https://cdn.example.test/song.mp3")).toBe(false);
  });
});
