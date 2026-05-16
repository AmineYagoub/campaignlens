# CampaignLens Roadmap

CampaignLens v1.0.0 is the hackathon launch: deterministic campaign detection, explainable dossiers, review workflow, guarded moderation actions, and Reddit-ready Expanded Mode.

## Near-Term Improvements

- Add a dedicated onboarding screen for first-time moderators.
- Add frontend interaction tests for dossier navigation, action preview, and settings.
- Improve the campaign replay into a richer interactive graph view.
- Add exportable diagnostics that redact content excerpts by default.
- Add optional dark mode after Reddit review is complete.

## Hard-Version Direction

These items are intentionally outside v1.0.0 because they need deeper safety review:

- Semantic harmful-narrative classification with an LLM or Reddit-approved classifier path.
- Multi-signal narrative clustering across related but non-identical wording.
- Reviewer assignment and team workflow.
- Stronger rollback tooling for partially reversible moderation actions.
- More advanced abuse-prevention controls for high-impact actions.

## Product Boundary

CampaignLens should remain a moderator decision-support tool. The roadmap should not turn scores into automatic accusations or automatic enforcement.
