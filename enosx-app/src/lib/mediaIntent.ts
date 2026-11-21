const IMAGE_ARTIFACT_NOUN = /\b(?:images?|pictures?|photos?|illustrations?|artworks?|art|logos?|icons?|avatars?|portraits?|wallpapers?|posters?|stickers?|drawings?|sketches?|graphics?|banners?)\b/i;
const IMAGE_CREATION_VERB = /\b(?:generate|create|make|draw|paint|render|illustrate|design|produce|compose)\b/i;

/** True for a direct request to create an image, not a request to search or explain. */
export function isImageGenerationRequest(text: string): boolean {
  const request = text.trim();
  if (!request || !IMAGE_ARTIFACT_NOUN.test(request)) return false;

  const isOnlineSearch = /\b(?:online|internet|web|youtube|vimeo)\b/i.test(request)
    || /\b(?:search|find|look\s+up|recommend|suggest)\b/i.test(request);
  if (isOnlineSearch) return false;

  const isInstructional = /\b(?:how\s+(?:do|can|should|to)|explain|teach\s+me|tutorial|steps\s+to|what\s+is)\b/i.test(request);
  if (isInstructional) return false;

  const hasCreationVerb = IMAGE_CREATION_VERB.test(request);
  if (!hasCreationVerb) return false;

  // Accept either “create an image” or “an image to be created” phrasing.
  return /\b(?:generate|create|make|draw|paint|render|illustrate|design|produce|compose)\b.{0,160}\b(?:images?|pictures?|photos?|illustrations?|artworks?|art|logos?|icons?|avatars?|portraits?|wallpapers?|posters?|stickers?|drawings?|sketches?|graphics?|banners?)\b/i.test(request)
    || /\b(?:images?|pictures?|photos?|illustrations?|artworks?|art|logos?|icons?|avatars?|portraits?|wallpapers?|posters?|stickers?|drawings?|sketches?|graphics?|banners?)\b.{0,100}\b(?:generate|create|make|draw|paint|render|illustrate|design|produce|compose)\b/i.test(request);
}
