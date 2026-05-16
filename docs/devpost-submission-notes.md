# CampaignLens Devpost Submission Notes

Use this as the source material for the Reddit Mod Tools and Migrated Apps Hackathon submission.

Hackathon: [Reddit Mod Tools and Migrated Apps Hackathon](https://mod-tools-migration.devpost.com)

## Category

Best New Mod Tool.

CampaignLens is a new Devvit moderation tool, not a ported Data API bot.

## Tool Overview

CampaignLens helps moderators spot coordinated campaign-shaped activity inside a subreddit. It watches real Reddit triggers, extracts compact signals, and groups repeated patterns into explainable dossiers.

Signals include repeated domains, brand-like phrases, harmful narrative watch terms configured by moderators, link obfuscation, timing bursts, near-duplicate phrasing, reports, and thread spread.

The moderator workflow is:

1. Open CampaignLens from the subreddit moderator menu.
2. Launch the dashboard in Expanded Mode.
3. Review active dossiers.
4. Open a dossier to inspect score breakdown, explanation, evidence, timeline, and replay.
5. Tune thresholds, watchlists, allowlists, and evidence caps in Settings.
6. Select specific evidence items.
7. Preview current Reddit moderation state.
8. Confirm and execute a supported action only when appropriate.
9. Review item-level action history.

CampaignLens does not automatically ban, remove, lock, accuse, or label users.

## Project Impact

CampaignLens targets a moderation pain point that is hard to handle manually: weak signals spread across multiple threads. A single post may look harmless, but repeated domains, similar phrasing, timing bursts, and obfuscated links can reveal a coordinated pattern.

Moderators benefit by:

- Saving time during pattern review.
- Seeing grouped evidence instead of searching threads manually.
- Understanding why a pattern surfaced before taking action.
- Avoiding account-level profiling or opaque user scores.
- Keeping enforcement human-confirmed and item-specific.

Communities that could benefit:

- Product, finance, local, or hobby communities targeted by repeated promotional campaigns.
- News or civic communities that need to review repeated harmful-narrative phrasing without relying on automatic enforcement.
- Growing communities where moderators need lightweight tools before campaigns become obvious in the mod queue.

## Judging Criteria Alignment

### Community Impact

CampaignLens reduces manual investigation time by grouping cross-thread signals into one dossier. It focuses on moderator review quality rather than automatic takedowns.

### Polish

The v1.0.0 release includes a Devvit Web dashboard, inline launch post, Expanded Mode workflow, settings, diagnostics, app icon, user docs, app review notes, privacy summary, permission matrix, release notes, and support guidance.

### Reliable UX

The dashboard uses a compact inline launch post to avoid scroll traps. The full experience opens in Expanded Mode. Dossiers update with realtime events and include manual refresh as a fallback.

### Ecosystem Impact

CampaignLens brings a broad, reusable campaign-analysis workflow to Devvit: evidence grouping, explainable scoring, local calibration, action preview, and guarded moderation execution.

## Safety And Privacy

- No automatic enforcement.
- No stored usernames, moderator IDs, reporter IDs, author IDs, or author hashes.
- No external LLM, embedding, analytics, or classifier calls.
- No cross-subreddit intelligence.
- Ban and mute actions are disabled in v1.0.0.
- Content outside the installed subreddit is rejected during action preview.
- Inline view is launch-only; full dashboard opens in Expanded Mode.

## Demo Path

1. Install or playtest CampaignLens in a test subreddit.
2. Open CampaignLens from the subreddit moderator menu.
3. Click `Open dashboard`.
4. Create three separate posts mentioning `demo-campaign.example` or `demo-campaign dot example`.
5. Open the generated dossier.
6. Show score breakdown, why it surfaced, replay, evidence, and timeline.
7. Select an evidence item.
8. Preview `LOCK`.
9. Confirm and execute.
10. Open Actions and show item-level history.

## Links

- App listing: add the developer.reddit.com app URL after publishing.
- Repository: [github.com/AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens)
- Issues: [github.com/AmineYagoub/campaignlens/issues](https://github.com/AmineYagoub/campaignlens/issues)
- Release notes: [release-v1.0.0.md](release-v1.0.0.md)
- User guide: [user-guide-and-settings.md](user-guide-and-settings.md)
