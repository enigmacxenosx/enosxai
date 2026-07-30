# ENOSX AI Improvements - Implementation Notes

## Voice Upgrade
- Upgraded from `eleven_monolingual_v1` to `eleven_v3` (ElevenLabs flagship model)
- Added speaker_boost for better voice quality
- Added voice selection (Laura female / Charlie male)
- Added text chunking for long responses (>4500 chars)
- Improved Web Speech API fallback with best voice selection

## Image Display
- Created `ImageDisplay.tsx` component with lightbox, download, expand
- Updated `MessageBubble.tsx` to detect `![alt](url)` markdown images
- Images from assistant are rendered inline with the text
- Shimmer loading state while image loads

## Image Generation
- Created `useImageGeneration.ts` hook
- Uses OpenRouter API: DALL-E 3 primary, Stability AI free as fallback
- Created `ImageGenButton.tsx` component
- Added image mode toggle to CommandBar
- When active, next message generates an image and displays inline
- Integrated into ChatPage and PhoneChatLayout

## Files Modified
- `enosx-app/src/hooks/useVoice.ts` — complete rewrite
- `enosx-app/src/components/MessageBubble.tsx` — image rendering added
- `enosx-app/src/components/CommandBar.tsx` — image mode toggle added

## Files Created
- `enosx-app/src/hooks/useImageGeneration.ts`
- `enosx-app/src/components/ImageDisplay.tsx`
- `enosx-app/src/components/ImageGenButton.tsx`

## Files Updated
- `enosx-app/src/pages/ChatPage.tsx` — image gen integration
- `enosx-app/src/components/PhoneChatLayout.tsx` — mobile image mode
