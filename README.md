# CampaignLens

CampaignLens is a Devvit-native moderator tool for spotting suspicious coordinated campaign patterns inside a subreddit.

Built for the [Reddit Mod Tools Migration Hackathon](https://mod-tools-migration.devpost.com).

## What is it?

- It turns repeated domains, brand mentions, harmful narrative watch terms, link obfuscation, timing bursts, near-duplicate phrasing, reports, and thread spread into explainable evidence dossiers.
- It gives moderators a dashboard to inspect why a campaign surfaced, review evidence, tune local settings, preview Reddit moderation state, and manually execute supported actions.
- It opens the full dashboard in user-initiated Expanded Mode so the inline Reddit post never traps scroll gestures.

## What isn't it?

- It is not an autonomous moderator.
- It does not automatically ban, remove, lock, or accuse users.
- It does not store usernames, moderator IDs, reporter IDs, author IDs, or author hashes.
- It does not send content to external LLM, embedding, analytics, or classifier services.

## How it works

1. Install CampaignLens on a subreddit.
2. Open the subreddit moderator menu and choose `Open CampaignLens`.
3. Click `Open dashboard` in the launch post.
4. Keep the default settings or tune thresholds, watchlists, allowlists, and evidence caps.
5. When repeated campaign-shaped activity appears, open the dossier.
6. Review the score breakdown, explanation, evidence, timeline, and replay.
7. Select specific evidence items, preview the action, confirm, and execute only if appropriate.

## Can I test it before installing?

Yes. Use a test subreddit and follow the [Reddit playtest runbook](docs/reddit-playtest-runbook.md). For a fast test, create three separate posts that repeat the same harmless domain, such as `demo-campaign.example`.

## Feedback and source

- GitHub: [AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens)
- Bugs and feature requests: [github.com/AmineYagoub/campaignlens/issues](https://github.com/AmineYagoub/campaignlens/issues)
- Pull requests: [github.com/AmineYagoub/campaignlens/pulls](https://github.com/AmineYagoub/campaignlens/pulls)

## Docs

- [User guide and settings](docs/user-guide-and-settings.md)
- [Reddit playtest runbook](docs/reddit-playtest-runbook.md)
- [App review readiness](docs/app-review-readiness.md)
- [Privacy summary](docs/privacy-summary.md)
- [Permission matrix](docs/permission-matrix.md)
- [Support and operations](docs/support-and-operations.md)
- [Devpost submission notes](docs/devpost-submission-notes.md)
- [Roadmap](docs/roadmap.md)
- [v1.0.2 release notes](docs/release-v1.0.2.md)
- [v1.0.1 release notes](docs/release-v1.0.1.md)

## Changelog

### 1.0.2

- Bumps app version to 1.0.2 to resolve Devvit upload version conflict.

### 1.0.1

- Improves fresh-subreddit first open by avoiding false moderator-check failures.
- Adds a loading state and failure toast for Settings saves.
- Standardizes command buttons with black backgrounds for a cleaner demo and Reddit review surface.
- Adds a demo video script and Devpost submission notes.

### 1.0.0

- Adds the complete trigger → dossier → evidence → preview → execute → history moderation loop.
- Adds Expanded Mode dashboard launch to avoid inline scroll traps.
- Adds local settings, diagnostics, privacy docs, permission matrix, support docs, and app icon.

## Development

```bash
npm install
npm run login
npm run dev
```

Run the release gate:

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

Publish after committing a clean working tree:

```bash
npm run launch
```

`npm run launch` uploads and publishes the Devvit app with the package version, creates the matching git tag, pushes it, and creates the GitHub release from `docs/release-v$npm_package_version.md`.
