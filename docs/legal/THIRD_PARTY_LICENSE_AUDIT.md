# Third-Party License Audit — Incomplete

**Status:** This is an audit checklist, not a third-party notices document or a license grant. No complete dependency, asset, or model-license inventory has been verified. Do not treat the proprietary root notice as overriding third-party rights.

## Required before redistributing installers or launching paid use

- Generate and review a license inventory for every production dependency in the root pnpm workspace, each workspace package, and desktop-shell, including transitive dependencies from the committed lockfiles.
- Generate the corresponding notices and include required license texts in web/desktop distributions where required. Check bundled fonts, icons, images, templates, generated assets, and copied snippets separately.
- Inventory every hosted or downloadable AI model and dataset by exact model/version, source, license, attribution terms, use restrictions, and output rules. The current README notes non-commercial terms for a Stable Diffusion 3.5 Large listing; confirm the exact endpoint/model license directly and do not rely on that model for paid/commercial use until counsel confirms a compatible license.
- Review vendor/API terms for hosted inference, OAuth integrations, media search, hosting, authentication, email, and database services. Service terms are separate from software licenses.
- Confirm that proprietary licensing applies only to Enosx Technologies' own code and assets. List excluded third-party components and their license texts in the final notices file.
- Record the audit date, tool and version, lockfile hashes, reviewer, exceptions, and distribution locations. Re-run after dependency, model, asset, or packaging changes.

## Current status

- Root package metadata currently conflicts with the README's proprietary statement; this change proposes setting the root metadata to UNLICENSED.
- A complete license report has not been run in this review. No dependency is represented here as MIT, Apache, or otherwise without verified evidence.
- This checklist must be completed before a commercial release or a claim that all bundled components are covered by the proprietary license.
