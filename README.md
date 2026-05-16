# CampaignLens

CampaignLens is a Devvit-native moderator tool for spotting suspicious coordinated campaign patterns inside a subreddit. It turns repeated domains, brand mentions, harmful narrative watch terms, link obfuscation, timing bursts, near-duplicate phrasing, reports, and thread spread into explainable evidence dossiers.

Built for the [Reddit Mod Tools Migration Hackathon](https://mod-tools-migration.devpost.com).

## v1.0.0 Launch

CampaignLens v1.0.0 is ready for hackathon submission, Reddit review, and GitHub release.

The app is evidence-first and moderator-controlled:

- No automatic bans, removals, locks, or accusations.
- No stored usernames, moderator IDs, reporter IDs, author IDs, or author hashes.
- No external LLM, embedding, analytics, or classifier calls.
- Full dashboard opens in user-initiated Expanded Mode so the inline Reddit post never traps scroll gestures.

## Repository

- GitHub: [AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens)
- Issues: [github.com/AmineYagoub/campaignlens/issues](https://github.com/AmineYagoub/campaignlens/issues)
- Pull requests: [github.com/AmineYagoub/campaignlens/pulls](https://github.com/AmineYagoub/campaignlens/pulls)

## Docs

- [User guide and settings](docs/user-guide-and-settings.md)
- [Reddit playtest runbook](docs/reddit-playtest-runbook.md)
- [App review readiness](docs/app-review-readiness.md)
- [Privacy summary](docs/privacy-summary.md)
- [Permission matrix](docs/permission-matrix.md)
- [Support and operations](docs/support-and-operations.md)
- [Roadmap](docs/roadmap.md)
- [v1.0.0 release notes](docs/release-v1.0.0.md)

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

`npm run launch` uploads and publishes the Devvit app with the package version, creates the matching git tag, pushes it, and creates the GitHub release from `docs/release-v1.0.0.md`.
