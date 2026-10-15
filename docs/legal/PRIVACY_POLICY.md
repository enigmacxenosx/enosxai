# ENOSX AI Privacy Notice — Draft for Counsel Review

**Status:** Draft only. Not effective and not ready to publish. Prepared 15 October 2026 from source-code review and product-owner inputs. Have Kenyan privacy counsel confirm the legal entity, applicable jurisdictions, lawful bases, child-consent flow, retention periods, processor terms, and deployed data flows before publication.

## Who operates ENOSX AI

The product owner identifies the operator as **Enosx Technologies**, based in Kenya. Confirm the exact registered name, registration details, and postal/service address before publication. Privacy requests: **enosxtech@gmail.com**.

## Information that may be processed

The current codebase appears to process the following categories, depending on the feature and configuration used:

- Account identifiers and profile details, such as email address, display name, provider ID, avatar, and preferences.
- Prompts, assistant responses, conversation titles, timestamps, and message attachments that a user chooses to submit.
- Content and identifiers from services a user connects, such as GitHub, Google, Vercel, or Shopify, within the permissions shown by that service.
- Technical diagnostics used to operate or troubleshoot the app, including error text, stack/component context, browser/user-agent, app version, page path, and request metadata.
- Local guest/profile and usage data stored by the browser or device.

The application currently has Firebase Authentication and Firestore profile/chat storage code, as well as separate Express authentication and Neon-backed history routes. The production use of those separate routes, their access controls, and the deployed retention settings have not been verified. Do not treat this draft as a complete description of live processing until those paths are confirmed.

## How information is used and where it may go

- To provide sign-in, save profiles and conversation history, and operate app features.
- Hosted AI chat requests are sent to NVIDIA endpoints in the current server code. Image, voice, and optional online-media features may use separately configured providers. If local Ollama is selected and correctly configured, those inference requests are intended to run locally; confirm each feature's actual network behavior before making a privacy promise.
- Optional media search can send a search query to Serper. A user-initiated OAuth connection can exchange data with the selected provider. Provider scopes and retention terms differ; users should review the provider's authorization screen.
- Automatic technical error reports are sent by email through Resend to enosxtech@gmail.com and enosxservices@gmail.com. The current report code includes technical diagnostics and states that conversation text, files, account credentials, and client IP are not included in the report email. Hosting and network providers may still process connection metadata.
- Hosting, authentication, database, AI, email, OAuth, and search providers may process information as service providers or under their own terms. Confirm the exact providers, regions, contracts, and retention settings before publication.

Prompts, selected attachments, and connected-service context may contain personal or confidential information. Do not submit information that the user is not authorized to share. Do not claim that AI providers do not retain or train on submitted content until the applicable provider terms and account settings have been checked.

## Storage, retention, and deletion

Guest data and some settings may remain in local browser/device storage. Signed-in profiles and conversations are designed to sync through Firebase/Firestore; the codebase also contains Neon-backed server routes. Exact production databases, regions, backup periods, deletion propagation, and retention schedules are **not verified**. Set and document a retention schedule, test deletion across all stores and backups, and replace this section with verified timelines before publication.

To ask about access, correction, deletion, or another privacy concern, email **enosxtech@gmail.com**. The company must confirm a workable request-verification and fulfillment process before publishing this notice.

## Children and age requirement — release gate

The product owner requested a minimum age of **6**. This draft does not establish that a six-year-old may lawfully use the service, and no verified age-assurance, parent/guardian authorization, supervision, or child-data rights workflow has been established in this review. **Do not enable or advertise access for children until qualified counsel approves the applicable rules and the product implements and tests the required consent, safety, access, deletion, and guardian-contact processes.** Replace this section with the approved policy before launch.

## Security and changes

The company should apply appropriate safeguards and update this notice when processing changes. No security measure eliminates all risk. The repository source review identified unresolved authentication/access-control questions; production controls have not been independently verified. Report privacy or security concerns to **enosxtech@gmail.com**.

## Contact

Enosx Technologies (Kenya; exact legal form and address to confirm)  
Email: enosxtech@gmail.com
