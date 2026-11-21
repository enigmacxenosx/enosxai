# ENOSX AI Model Tier Policy

## Purpose

ENOSX AI exposes three user-facing chat tiers. The tier is a product-level response profile that influences provider model routing, reasoning budget, response depth, and modality handling. It is a recommendation and routing policy, not a guarantee of correctness.

The policy is implemented in `enosx-app/src/lib/modelTierPolicy.ts`. Provider model IDs remain server-side configuration in `api/chat.ts` and deployment environment variables.

## Tier definitions

| Tier | Internal mode | Best suited for | Default behavior |
|---|---|---|---|
| ENOSX One | `ex-core` | Everyday questions, summaries, translation, rewrites, brainstorming, and ordinary drafting | Lowest-latency general assistance |
| ENOSX Studio | `ex-pro` | Coding, debugging, repository work, document analysis, research, evidence comparison, and image understanding | Deeper expert responses and shared vision routing |
| ENOSX Nexus | `enosh-mind` | Architecture, strategy, complex science or mathematics, engineering analysis, and risk-heavy decisions | Deliberate reasoning with the largest response budget |

### Important modality rule

ENOSX Nexus is text-only. If a request in Nexus includes image data, the server routes visual processing through the Studio vision configuration. The application preserves the user's goal but should not claim that the Nexus text model directly processed image pixels.

## Action mapping

The centralized mapping uses these action categories:

- `everyday_chat` → ENOSX One
- `summarize_translate` → ENOSX One
- `creative_drafting` → ENOSX One
- `coding_debugging` → ENOSX Studio
- `document_analysis` → ENOSX Studio
- `image_understanding` → ENOSX Studio
- `research` → ENOSX Studio
- `github_work` → ENOSX Studio
- `architecture_strategy` → ENOSX Nexus
- `complex_science_math` → ENOSX Nexus
- `high_stakes_decision` → ENOSX Nexus

To change a recommendation, edit the `MODEL_TIER_RECOMMENDATIONS` array rather than scattering tier names across UI components. Keep provider model IDs out of the client policy module.

## Automatic recommendation notifications

`recommendModelTierForPrompt()` performs conservative client-side classification. It only returns a recommendation for high-confidence signals such as GitHub or code work, architecture and strategy, equations or engineering calculations, risk-heavy decisions, research/document review, or image attachments.

When the recommended tier differs from the selected tier:

1. A Sonner toast explains the recommendation and why it may help.
2. The existing system notification path receives a `Model tier suggestion` notification when browser notifications are available.
3. The request still runs with the user's selected tier. The app never silently switches modes.

Ordinary prompts that do not produce a high-confidence match do not trigger a notification. This prevents the feature from becoming noisy and keeps ENOSX One as a practical default.

The notification is informational only. Users can dismiss it and continue, or select the suggested tier from the mode picker before sending a follow-up request.

## Provider routing

The server maps the selected mode to deployment-configured NVIDIA models:

- `NVIDIA_EX_CORE_MODEL`, falling back to `NVIDIA_MODEL`, then the Core default.
- `NVIDIA_EX_PRO_MODEL`, falling back to `NVIDIA_MODEL`, then the Pro default.
- `NVIDIA_ENOSH_MIND_MODEL`, falling back to the Nexus default.
- Vision requests use the mode-specific vision override or `NVIDIA_VISION_MODEL`. Nexus image requests use the Studio vision route.

The actual model may vary by deployment. Do not expose provider credentials or promise a specific provider model in client-facing copy unless the runtime has verified it.

## Extending the policy

When adding a new action category:

1. Add the category to `ModelTierAction`.
2. Add one entry to `MODEL_TIER_RECOMMENDATIONS` with a mode, label, and concise reason.
3. Add a high-confidence detector in `recommendModelTierForPrompt()`.
4. Add tests for both the positive match and an unrelated prompt.
5. Update the mode picker summary if the category changes the short user-facing guide.
6. Run the frontend typecheck and the model-tier tests.

Avoid automatic mode switching unless the product requirement changes explicitly. A recommendation should remain reversible, visible, and subordinate to the user's selected mode.
