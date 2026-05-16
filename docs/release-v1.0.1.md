# CampaignLens v1.0.1 Release Notes

Release date: May 16, 2026

## Summary

CampaignLens v1.0.1 is the hackathon submission polish release. It keeps the v1.0.0 moderation loop and adds first-open reliability, demo-readiness improvements, clearer launch docs, and UI polish for Reddit review.

Core loop:

1. Detect repeated campaign-shaped patterns from real Reddit triggers.
2. Build an explainable dossier with score breakdown, evidence, timeline, and replay.
3. Let moderators review and tune the result.
4. Preview live Reddit moderation state before any action.
5. Execute only after explicit confirmation.
6. Store item-level action history without moderator or author identity.

## Changes Since v1.0.0

- Improved moderator verification for fresh subreddits by falling back from scoped moderator lookup to the full moderator list.
- Preserved explicit username verification for moderator-only API access.
- Added a Settings save loading state, disabled state, and failure toast.
- Standardized command buttons with black backgrounds across launch, settings, review, feedback, and moderation flows.
- Improved the in-app success result panel with a stronger emerald success color.
- Added [devpost-submission-notes.md](devpost-submission-notes.md) for copy-ready hackathon submission material.
- Updated README changelog and release links for v1.0.1.

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
npm run build
```

Expected status: all checks pass.

## Support

- Repository: [github.com/AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens)
- Issues: [github.com/AmineYagoub/campaignlens/issues](https://github.com/AmineYagoub/campaignlens/issues)
- Pull requests: [github.com/AmineYagoub/campaignlens/pulls](https://github.com/AmineYagoub/campaignlens/pulls)

## Publish Commands

Publish to Reddit and GitHub:

```bash
npm run launch
```

The launch script creates and pushes the `v1.0.1` git tag, then creates the GitHub release from this file. It requires a clean committed working tree, an authenticated Devvit CLI session, and an authenticated `gh` CLI session.
