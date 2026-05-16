# CampaignLens Support And Operations

Last updated: May 16, 2026

## Support Contact

Use GitHub for public support:

- Issues: [github.com/AmineYagoub/campaignlens/issues](https://github.com/AmineYagoub/campaignlens/issues)
- Pull requests: [github.com/AmineYagoub/campaignlens/pulls](https://github.com/AmineYagoub/campaignlens/pulls)

During Reddit review and playtest, support requests should include:

- App version.
- Subreddit name.
- Approximate time of the issue.
- The action attempted.
- A screenshot of the CampaignLens diagnostics panel.

Do not include raw private content, usernames, reporter identity, or moderator identity in support notes.

## Diagnostics

The Settings screen includes a diagnostics panel backed by `GET /api/health`. It reports:

- Overall health status.
- Redis probe status.
- Config sanity status.
- Baseline mode.
- Memory pressure status.
- Active dossier count.
- Action history record count.
- Effective evidence caps.

The diagnostics payload intentionally excludes raw content, author usernames, moderator usernames, reporter identity, and evidence excerpts.

## Known Operational Risks

1. Devvit SDK behavior can change between builds. SDK access is isolated behind `src/devvit/*`.
2. A duplicate local CLI process can cause port or app-version upload conflicts.
3. New installs may report cold baseline until enough local subreddit history exists.
4. Reddit custom post creation requires the approved launch-post permission path.
5. Redis failures should be warnings in triggers, not user-facing 500s.
6. `npm audit --omit=dev` currently reports residual advisories through the pinned Devvit SDK dependency graph. Do not force-fix them by downgrading or changing Devvit without a full Reddit playtest.

## Broken Release Rollback

1. Stop all local `devvit playtest` or upload processes.
2. Confirm no process is still listening on the Devvit connection port.
3. Rebuild from the last known-good commit.
4. Run `npm run type-check`, `npm run lint`, `npm run test`, and `npm run build`.
5. Upload the known-good version.
6. Open the test subreddit and verify the inline launch post loads.
7. Click `Open dashboard` and verify the full dashboard opens in Expanded Mode.

## SDK Upgrade Checklist

1. Upgrade only the SDK adapter layer first.
2. Run the SDK adapter boundary tests.
3. Verify launch post creation.
4. Verify the expanded dashboard entrypoint opens from the launch post.
5. Verify Redis, realtime, and trigger budget logs.
6. Run the real Reddit smoke test from the app review guide.
