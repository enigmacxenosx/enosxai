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

  it.each([
    "https://open.spotify.com/album/0123456789abcdef?si=share-token",
    "https://open.spotify.com/playlist/0123456789abcdef/",
    "https://open.spotify.com/episode/0123456789abcdef",
  ])("embeds supported Spotify collection URL %s", (url) => {
    expect(resolveMediaUrl(url)).toMatchObject({ type: "audio", embedded: true });
  });

  it.each([
    "https://open.spotify.com/track/not-valid!",
    "https://open.spotify.com/artist/0123456789abcdef",
    "https://open.spotify.com.evil.test/track/0123456789abcdef",
  ])("rejects unsupported or deceptive Spotify URL %s", (url) => {
    expect(resolveMediaUrl(url)).toBeNull();
  });

  it.each([
    "https://www.youtube.com/watch?v=abcdefghijk&t=30",
    "https://youtu.be/abcdefghijk/",
    "https://youtube.com/shorts/abcdefghijk",
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  ])("embeds supported YouTube URL form %s", (url) => {
    expect(resolveMediaUrl(url)).toMatchObject({
      type: "embed",
      src: "https://www.youtube-nocookie.com/embed/abcdefghijk",
    });
  });

  it.each([
    "https://youtu.be/short",
    "https://youtube.com/watch?list=playlist-only",
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
  ])("rejects malformed or deceptive YouTube URL %s", (url) => {
    expect(resolveMediaUrl(url)).toBeNull();
  });

  it("supports Vimeo video URL variants and rejects non-video paths", () => {
    expect(resolveMediaUrl("https://vimeo.com/12345678?share=copy")).toMatchObject({
      type: "embed",
      src: "https://player.vimeo.com/video/12345678",
    });
    expect(resolveMediaUrl("https://player.vimeo.com/video/12345678")).toMatchObject({ type: "embed" });
    expect(resolveMediaUrl("https://vimeo.com/channels/staffpicks/not-a-number")).toBeNull();
    expect(resolveMediaUrl("https://vimeo.com.evil.test/12345678")).toBeNull();
  });

  it("requires a SoundCloud artist and track path and URL-encodes its player target", () => {
    expect(resolveMediaUrl("https://soundcloud.com/artist")).toBeNull();
    const result = resolveMediaUrl("https://soundcloud.com/artist/track-name?utm_source=test");
    expect(result).toMatchObject({ type: "audio", embedded: true });
    expect(result?.src).toContain(encodeURIComponent("https://soundcloud.com/artist/track-name?utm_source=test"));
    expect(resolveMediaUrl("https://soundcloud.com.evil.test/artist/track-name")).toBeNull();
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
