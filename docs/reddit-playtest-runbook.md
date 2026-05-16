# CampaignLens Reddit Playtest Runbook

Created: 2026-05-02

Use this checklist to run a real moderator playtest in `r/campaignlens_dev`.

## Preflight

1. Confirm CLI auth:
   ```bash
   npm run login
   ```

2. Run local verification:
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run build
   ```

3. Start Devvit playtest:
   ```bash
   npm run dev
   ```

4. Confirm the installed Devvit package version is the pinned `@next` build:
   ```bash
   npm ls devvit @devvit/web @devvit/start --depth=0
   ```

   Expected: all three are `0.12.23-next-2026-05-01-20-06-15-4d8baf0a4.0`. This pin is intentional because Devvit `0.12.20` and `0.12.21` reproduced an opaque `SubmitCustomPost` runtime failure during playtest.

5. If Reddit asks to approve updated app permissions, approve the `SUBMIT_POST` as-user permission. CampaignLens uses it only when a moderator explicitly clicks `Open CampaignLens` and app-account dashboard post creation is unavailable.

6. Wait for `Playtest ready`.

7. Open:
   [https://www.reddit.com/r/campaignlens_dev/?playtest=campaignlens](https://www.reddit.com/r/campaignlens_dev/?playtest=campaignlens)

## Dashboard Smoke Test

1. Open the subreddit moderator menu.
2. Click `Open CampaignLens`.
3. Expected:
   - A compact CampaignLens launch post is created when Reddit accepts custom post creation from the menu context.
   - Reddit navigates to the launch post.
   - The inline post shows `CampaignLens` and an `Open dashboard` button.
   - The inline post does not create an internal scrolling region.
4. Click `Open dashboard`.
5. Expected:
   - CampaignLens opens in Expanded Mode.
   - The expanded dashboard shows `CampaignLens` and the current subreddit.

If Devvit playtest rejects custom post creation, the menu should show a neutral toast and navigate back to:
[https://www.reddit.com/r/campaignlens_dev/?playtest=campaignlens](https://www.reddit.com/r/campaignlens_dev/?playtest=campaignlens)

In that case, check server logs for:

```txt
CampaignLens failed to open dashboard post
```

If the error says `To call this API with 'runAs: "USER"'`, rerun `npm run dev`, approve the updated playtest permissions, refresh the playtest URL, and click the menu again.

If the error says `undefined undefined: undefined` at `GenericPluginClient.SubmitCustomPost`, verify the project is still on the pinned Devvit `@next` build. On 2026-05-02 this exact failure reproduced on `0.12.20` and `0.12.21`, then succeeded on `0.12.23-next-2026-05-01-20-06-15-4d8baf0a4.0`.

## Real Dossier Test

1. Open the dashboard from the launch post.
2. Create several real test posts/comments in the playtest subreddit that repeat a domain you control.

3. Expected:
   - Active dossier list shows a dossier for the repeated domain.

4. Open the dossier.

5. Verify:
   - Score breakdown renders.
   - Why-this-surfaced bullets render.
   - Campaign Replay renders non-empty nodes.
   - Evidence cards show short excerpts only.
   - Timeline renders mention/obfuscation events.
   - No usernames or account IDs appear.

6. Delete the test posts/comments when finished and verify delete cleanup removes related evidence over refreshes.

## Real Content Trigger Test

Create at least three posts in separate threads inside the playtest subreddit with the same test domain and similar wording. The default threshold is tuned for campaign shape, so same-thread comments alone may not surface a dossier.

Example post title/body:

```txt
Testing CampaignLens: demo-campaign.example

A repeated mention of demo-campaign dot example with similar wording for CampaignLens playtest.
```

Use small variations across three or more posts, for example:

```txt
I found this comparison useful: demo-campaign.example
This demo campaign dot example page helped me decide.
Another useful breakdown is at demo-campaign.example.
People keep recommending demo-campaign dot example for this topic.
The same guide at demo-campaign.example has a surprisingly similar writeup.
```

Expected:

1. `on-post-submit` or `on-comment-submit` trigger logs a budget summary.
2. Redis failures, if any, are warnings instead of Reddit-facing 500s.
3. A dossier appears once scoring threshold is crossed.

Watch logs for:

```txt
CampaignLens trigger budget summary
```

Investigate if:

- `redisFailureCount` is greater than `0`.
- `overCommandBudget` is `true`.
- `overTimeBudget` is `true`.

## Report Test

1. Report one of the related test posts or comments.
2. Wait for trigger processing.
3. Refresh the dashboard.

Expected:

- Report counters increment for the matching signal.
- Dossier score/explanation can reflect report reinforcement.
- Trigger returns HTTP 200.

## Delete Test

1. Delete one related test post/comment.
2. Refresh the dashboard.

Expected:

- Evidence key is removed.
- `cl:evidence:content:{contentId}` is removed.
- Signal index membership is removed.
- Active dossier examples with that `contentId` are redacted when available.

## Feedback Test

1. Open an active dossier.
2. Click one action:
   - Watch
   - Ignore
   - Benign
   - Campaign
   - Escalate
   - False +

Expected:

- Terminal actions remove the dossier from the active list.
- Feedback stats update.
- Local scoring weights adjust for benign/false-positive/confirmed feedback.

## Settings Test

1. Open Settings.
2. Adjust threshold, weights, evidence caps, allowlist, watchlist, and harmful narrative terms.
3. Save.
4. Refresh.

Expected:

- Saved config persists.
- Allowlisted domains are not stored as evidence.
- Watchlisted domains can surface at lower review threshold.
- Harmful narrative terms categorize matching dossiers as possible harmful narrative.

## Harmful Narrative Category Test

1. Open Settings.
2. Add a test term under Harmful Narrative Terms, for example:
   ```txt
   coded slogan
   ```
3. Save settings.
4. Create at least three posts in separate threads with small variations that include the same term.
5. Refresh the dashboard.

Expected:

- A dossier appears after the repeated pattern crosses threshold.
- The dossier category is `possible harmful narrative`.
- The explanation says the category matched moderator-configured watch terms.
- No automatic enforcement occurs.

## Acceptance Criteria

The app is ready for broader real-world testing when:

1. `npm run dev` reaches Playtest ready.
2. Dashboard opens from the moderator menu, or the menu shows a visible error toast without a 500 while Devvit custom post creation is unavailable.
3. No demo seed/reset routes are available in runtime.
4. Real post/comment triggers produce no HTTP 500s.
5. Dossiers appear for repeated domain/brand/harmful-term patterns.
6. Reports affect scoring.
7. Deletes remove evidence and redact examples.
8. Moderator feedback updates dossier status and stats.
9. Logs show trigger budget summaries.
10. No usernames, moderator IDs, reporter IDs, author IDs, or author hashes appear in stored dossier UI.

## Current Known Limitations

1. Campaign Replay is functional but compact; it is not yet a full interactive graph canvas.
2. Trigger budget tracking is logging-only; it does not yet skip non-critical writes when a budget is exceeded.
3. Deep trigger integration tests with mocked Devvit Redis/Reddit runtime are still limited.
