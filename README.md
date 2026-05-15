# CampaignLens Atlas

CampaignLens Atlas is a Devvit-native moderator tool for spotting suspicious coordinated campaign patterns inside a subreddit. It turns repeated domains, brand mentions, moderator-configured harmful narrative terms, link obfuscation, timing bursts, near-duplicate phrasing, reports, and thread spread into explainable evidence dossiers.

CampaignLens does not label users, score accounts, ban automatically, remove automatically, or send data to external AI services. It gives moderators structured evidence so they can decide what to do.

## Release

Current release candidate: `v0.1.0`.

This version has been playtested in `r/campaignlens_dev` with the full moderator loop: detect a repeated pattern, inspect the dossier, preview a reversible moderation action, execute `LOCK`, and verify item-level action history.

## What It Does

- Watches post, comment, report, delete, Automod filter, and mod action triggers.
- Extracts compact content-level signals: domains, brand-like phrases, obfuscation flags, short excerpts, and SimHash fingerprints.
- Stores evidence samples with short TTLs and content-to-evidence indexes for report/delete cleanup.
- Builds active dossiers when deterministic scoring crosses local thresholds.
- Shows a Devvit Web dashboard with active dossiers, score breakdowns, evidence excerpts, timelines, replay, settings, and moderator actions.
- Learns from moderator feedback by adjusting local scoring weights.

## What It Does Not Do

- No automatic bans, removals, locks, or accusations.
- No bot labels, user trust scores, or account history profiling.
- No cross-subreddit intelligence.
- No external LLM, embedding, or analytics service.
- No stored usernames, moderator IDs, reporter IDs, author IDs, or author hashes.

## Tech Stack

- Devvit `0.12.23-next-2026-05-01-20-06-15-4d8baf0a4.0`
- Hono server routes
- React 19 Devvit Web client
- Tailwind CSS 4
- TypeScript
- Vitest

## Setup

Install dependencies:

```bash
npm install
```

Authenticate the Devvit CLI:

```bash
npm run login
```

Use the configured playtest subreddit in `devvit.json`:

```json
{
  "dev": {
    "subreddit": "campaignlens_dev"
  }
}
```

## Local Verification

Run the full local gate:

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

Expected current status:

- TypeScript passes.
- ESLint passes.
- Vitest passes with 171 tests.
- Vite build completes.

## Reddit Playtest

Start playtest:

```bash
npm run dev
```

When Devvit reports `Playtest ready`, open:

[https://www.reddit.com/r/campaignlens_dev/?playtest=campaignlens](https://www.reddit.com/r/campaignlens_dev/?playtest=campaignlens)

Use the subreddit moderator menu item:

```txt
Open CampaignLens Atlas
```

The menu handler creates a CampaignLens dashboard custom post and navigates to it. If Devvit rejects custom post creation, the app shows a visible error toast and logs the failure.

Note: CampaignLens is pinned to the Devvit `@next` build above because Devvit `0.12.20` and `0.12.21` reproduced an opaque `SubmitCustomPost` runtime failure (`undefined undefined: undefined`) during playtest. The pinned `@next` build created the dashboard post successfully in `r/campaignlens_dev` on 2026-05-02.

## Real Test Checklist

1. Run `npm run dev`.
2. Open the playtest URL and refresh after upload.
3. Use the moderator menu item to open CampaignLens Atlas.
4. Create at least three real posts in separate threads containing the same repeated domain or phrase.
5. Confirm an active dossier appears.
6. Open the dossier detail screen.
7. Verify score breakdown, replay, evidence cards, timeline, and explanation bullets.
8. Report one related post/comment.
9. Confirm report score or priority changes after refresh.
10. Delete one related post/comment.
11. Confirm stored evidence is removed and matching dossier examples are redacted when possible.
12. Mark a dossier benign, ignored, confirmed, or escalated.
13. Confirm terminal actions remove the dossier from the active list.
14. Watch server logs for `CampaignLens trigger budget summary`; investigate warnings for Redis failures, high command count, or long trigger duration.

## Key Files

- Server entry: `src/index.ts`
- Devvit config: `devvit.json`
- Trigger handlers: `src/routes/internal.triggers.ts`
- Dashboard menu handler: `src/routes/internal.menu.ts`
- Ingestion pipeline: `src/services/content-ingestion.service.ts`
- Dossier logic: `src/services/dossier.service.ts`
- Scoring: `src/services/scoring.service.ts`
- Devvit SDK adapters: `src/devvit/*`
- Redis adapter: `src/devvit/redis-client.ts`
- Trigger budget tracker: `src/services/trigger-budget.service.ts`
- React app: `src/client/src/app/App.tsx`
- Hackathon pitch: `docs/hackathon-pitch.md`
- Playtest runbook: `docs/reddit-playtest-runbook.md`
- Hard version roadmap: `docs/hard-version-roadmap.md`

## Privacy And Safety Notes

CampaignLens stores compact evidence samples, short excerpts, signal keys, timestamps, thread IDs, and deterministic fingerprints. It does not store usernames or profile-level identifiers. Delete triggers remove evidence records and redact matching active dossier examples when the content ID is available.

Moderator-facing language should stay evidence-based: say a pattern is unusual, repeated, obfuscated, or worth review. Do not say a user is guilty, a bot, or a spammer.

## Deployment

Upload a new Devvit app version:

```bash
npm run deploy
```

Publish `v0.1.0` only after playtest validation:

```bash
npm run launch
```

`npm run launch` uploads, publishes to Reddit with the package version, creates the matching git tag, pushes it, and creates the GitHub release from `docs/release-v0.1.0.md`. Run it only after committing and pushing a clean working tree.
