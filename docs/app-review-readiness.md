# CampaignLens App Review Readiness

Last updated: May 16, 2026

## App Description

CampaignLens helps Reddit moderators detect repeated campaign-shaped patterns across a subreddit. It groups weak signals such as repeated domains, brand bursts, obfuscated links, moderator-configured harmful narrative terms, near-duplicate phrasing, thread spread, and reports into explainable evidence dossiers.

CampaignLens does not automatically remove, lock, ban, mute, or accuse users. Moderators stay in control: they open a dossier, select specific content, preview current Reddit state, review rollback limitations, confirm, and execute supported actions manually.

Campaign categories are review aids. `POSSIBLE_HARMFUL_NARRATIVE` means the dossier matched terms configured by moderators; it is not a semantic determination that content violates Reddit policy.

## Safe-Use Statement

CampaignLens is a review aid, not an autonomous enforcement system. Scores mean “worth moderator review,” not guilt or policy violation. The app language should remain evidence-based and avoid calling people bots, spammers, or malicious actors.

## Data Statement

See [privacy-summary.md](privacy-summary.md) for stored and non-stored data boundaries.

## Permissions

See [permission-matrix.md](permission-matrix.md) for a feature-by-feature capability matrix.

See [user-guide-and-settings.md](user-guide-and-settings.md) for moderator setup, tuning, and usage guidance.

Support, issues, and pull requests are handled through [github.com/AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens).

## Reviewer Reproduction Path

1. Install the app into a test subreddit.
2. Open CampaignLens from the subreddit moderator menu.
3. Confirm the inline launch post shows an `Open dashboard` button and no internal scroll region.
4. Click `Open dashboard` to enter Expanded Mode.
5. Create three posts in separate threads that mention `demo-campaign.example` or `demo-campaign dot example`.
6. Refresh the dashboard.
7. Open the generated dossier.
8. Review score breakdown, explanation bullets, replay, evidence, and timeline.
9. Select one evidence item, preview `LOCK`, confirm, and execute.
10. Execute `UNLOCK` on the same item.
11. Open the Actions tab and verify both item-level records.

## Screenshots To Capture

- Onboarding/settings diagnostics.
- Active dossier list.
- Dossier score breakdown.
- Why This Surfaced.
- Evidence list.
- Action preview confirmation.
- Review queue.
- Action history.

## Current Review Notes

- Ban and mute are disabled.
- No automatic enforcement occurs from triggers, scores, reports, or watch rules.
- The current harmful-narrative category is deterministic and moderator-configured; LLM semantic classification is roadmap-only.
- The app uses `SUBMIT_POST` as user only when the moderator explicitly opens the dashboard custom post.
- The inline custom post is only a launch surface. The full dashboard opens through user-initiated Expanded Mode to avoid inline scroll traps.
- Functional changes that expand enforcement surface should be resubmitted for review.
