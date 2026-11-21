export type ResolvedMediaKind = "image" | "video" | "audio" | "embed";

export interface ResolvedMediaUrl {
  type: ResolvedMediaKind;
  src: string;
  openUrl: string;
  embedded?: boolean;
}

const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "webm", "ogv", "mov"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "m4b", "aac", "wav", "ogg", "oga", "opus", "flac", "aiff", "aif"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "tif", "tiff"]);
const IMAGE_HOSTS = new Set([
  "images.unsplash.com", "i.imgur.com", "i.redd.it", "preview.redd.it",
  "media.giphy.com", "images.giphy.com", "media.tenor.com", "images.pexels.com",
  "cdn.pixabay.com", "lh3.googleusercontent.com", "pbs.twimg.com", "upload.wikimedia.org",
  "raw.githubusercontent.com", "cdn.discordapp.com", "images.ctfassets.net",
  "res.cloudinary.com", "images.prismic.io", "imagedelivery.net",
]);

function isHostOrSubdomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith("." + domain);
}

export function resolveMediaUrl(value: string, explicitImage = false, explicitVideo = false, explicitAudio = false): ResolvedMediaUrl | null {
  if (/^data:image\//i.test(value)) return { type: "image", src: value, openUrl: value };
  if (/^data:video\//i.test(value)) return { type: "video", src: value, openUrl: value };
  if (/^data:audio\//i.test(value)) return { type: "audio", src: value, openUrl: value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;

  const hostname = url.hostname.toLowerCase();
  const openUrl = url.toString();
  if (isHostOrSubdomain(hostname, "open.spotify.com")) {
    const spotifyPath = url.pathname.match(/^\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)(?:\/|$)/);
    if (spotifyPath) return { type: "audio", src: `https://open.spotify.com/embed/${spotifyPath[1]}/${spotifyPath[2]}`, openUrl, embedded: true };
  }
  if (isHostOrSubdomain(hostname, "soundcloud.com") && url.pathname.split("/").filter(Boolean).length >= 2) {
    const playerUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(openUrl)}&auto_play=false&visual=false`;
    return { type: "audio", src: playerUrl, openUrl, embedded: true };
  }

  const youtubeHost = isHostOrSubdomain(hostname, "youtube.com") || isHostOrSubdomain(hostname, "youtube-nocookie.com") || hostname === "youtu.be";
  if (youtubeHost) {
    let videoId = "";
    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") || "";
    } else {
      videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})(?:\/|$)/)?.[1] || "";
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return { type: "embed", src: "https://www.youtube-nocookie.com/embed/" + videoId, openUrl };
    }
  }

  if (isHostOrSubdomain(hostname, "vimeo.com")) {
    const videoId = url.pathname.match(/(?:^|\/)(?:video\/)?([0-9]{6,})(?:\/|$)/)?.[1];
    if (videoId) return { type: "embed", src: "https://player.vimeo.com/video/" + videoId, openUrl };
  }

  const extension = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
  const contentHint = [url.searchParams.get("mime"), url.searchParams.get("type"), url.searchParams.get("format"), url.searchParams.get("fm")]
    .filter(Boolean).join(" ").toLowerCase();
  const hintedVideo = /video\//.test(contentHint) || /\b(mp4|m4v|webm|ogv|mov)\b/.test(contentHint);
  const hintedAudio = /audio\//.test(contentHint) || /\b(mp3|m4a|m4b|aac|wav|ogg|oga|opus|flac|aiff|aif)\b/.test(contentHint);
  if (AUDIO_EXTENSIONS.has(extension) || hintedAudio || (explicitAudio && !explicitVideo)) {
    return { type: "audio", src: openUrl, openUrl };
  }
  if (VIDEO_EXTENSIONS.has(extension) || hintedVideo || explicitVideo) {
    return { type: "video", src: openUrl, openUrl };
  }

  const hintedImage = /image\//.test(contentHint) || /\b(jpg|jpeg|png|gif|webp|svg|bmp|avif|tif|tiff)\b/.test(contentHint);
  const isKnownImageHost = Array.from(IMAGE_HOSTS).some((domain) => isHostOrSubdomain(hostname, domain));
  if (IMAGE_EXTENSIONS.has(extension) || hintedImage || isKnownImageHost || explicitImage) {
    return { type: "image", src: openUrl, openUrl };
  }
  return null;
}

export function isImageUrl(value?: string): value is string {
  return Boolean(value && resolveMediaUrl(value)?.type === "image");
}
