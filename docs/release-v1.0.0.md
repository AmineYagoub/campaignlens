# CampaignLens v1.0.0 Release Notes

Release date: May 16, 2026

## Summary

CampaignLens v1.0.0 is the hackathon launch and Reddit review release. It provides an evidence-first moderator workflow for detecting coordinated campaign-shaped activity without storing user identities, calling external AI services, or taking automatic enforcement action.

Core loop:

1. Detect repeated campaign-shaped patterns from real Reddit triggers.
2. Build an explainable dossier with score breakdown, evidence, timeline, and replay.
3. Let moderators review and tune the result.
4. Preview live Reddit moderation state before any action.
5. Execute only after explicit confirmation.
6. Store item-level action history without moderator or author identity.

## Hackathon Context

CampaignLens was built for the [Reddit Mod Tools Migration Hackathon](https://mod-tools-migration.devpost.com). The v1.0.0 submission focuses on a complete, judge-testable moderation loop rather than a mock dashboard.

## What Works

- Devvit subreddit menu opens a compact CampaignLens launch post.
- The full dashboard opens from the launch post in user-initiated Expanded Mode.
- Real post/comment/report/delete/mod-action triggers feed the detection pipeline.
- Dossiers surface from repeated domains, brand-like phrases, obfuscated links, harmful narrative watch terms, timing bursts, near-duplicates, reports, and thread spread.
- Realtime updates refresh active dossiers after triggers finish.
- Dossier detail shows explanation bullets, score breakdown, evidence excerpts, timeline, and campaign replay.
- Settings persist thresholds, weights, allowlists, watchlists, harmful narrative terms, and evidence caps.
- Review queue supports lightweight human review events.
- Moderation action preview hydrates live Reddit state before execution.
- Reversible actions such as `LOCK`, `UNLOCK`, `APPROVE`, `REMOVE`, `SPAM`, and `IGNORE_REPORTS` execute only after explicit confirmation.
- Action history records item-level succeeded, failed, and skipped outcomes.
- Diagnostics report app version, Redis/config/baseline/memory health, active dossier count, and action history count.
- API routes return structured JSON errors for moderator-only diagnostics and review screens.
- Configuration updates reject out-of-range numeric values before saving.
- App icon is included at `assets/icon.png` and wired through `devvit.json` marketing assets.

## Safety Properties

- No automatic enforcement from triggers or scores.
- No stored usernames, moderator IDs, reporter IDs, author IDs, or author hashes.
- No external LLM, embedding, analytics, or classifier calls.
- No cross-subreddit intelligence.
- Ban and mute actions are disabled in this release.
- Content outside the installed subreddit is rejected during action preview.
- Inline Reddit view is launch-only; detailed workflows run in Expanded Mode to avoid scroll traps.

## Verified Locally

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

Expected status: all checks pass; Vitest reports 23 test files and 173 tests.

## Verified On Reddit

Playtest subreddit: `r/campaignlens_dev`

Validated flows:

- CampaignLens opened from the subreddit moderator menu.
- Inline launch post showed no scroll-trapping dashboard.
- Expanded dashboard opened from `Open dashboard`.
- Repeated `campaign.example` and `demo-campaign.example` content created dossiers.
- Harmful narrative watch terms categorized a dossier as `Possible Harmful Narrative`.
- `LOCK` and `UNLOCK` executed against selected Reddit posts.
- Action history showed item-level success results.

## Support

- Repository: [github.com/AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens)
- Issues: [github.com/AmineYagoub/campaignlens/issues](https://github.com/AmineYagoub/campaignlens/issues)
- Pull requests: [github.com/AmineYagoub/campaignlens/pulls](https://github.com/AmineYagoub/campaignlens/pulls)

## Publish Commands

Publish to Reddit and GitHub:

```bash
npm run launch
```

The launch script creates and pushes the `v1.0.0` git tag, then creates the GitHub release from this file. It requires a clean committed working tree, an authenticated Devvit CLI session, and an authenticated `gh` CLI session.
