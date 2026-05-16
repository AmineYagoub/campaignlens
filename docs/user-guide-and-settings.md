# CampaignLens User Guide And Settings

Last updated: May 16, 2026

This guide is for moderators installing CampaignLens in a real subreddit or Reddit review environment. CampaignLens is evidence-first: it surfaces repeated campaign-shaped patterns, explains why they appeared, and requires a moderator to choose any action.

CampaignLens does not automatically remove content, ban users, label accounts, profile authors, or send content to external AI services.

For support, bug reports, or pull requests, use [github.com/AmineYagoub/campaignlens](https://github.com/AmineYagoub/campaignlens).

## Quick Start

1. Install CampaignLens in the subreddit.
2. Open the subreddit moderator menu.
3. Click `Open CampaignLens`.
4. Click `Open dashboard` in the inline launch post.
5. Keep the default settings for the first test.
6. Create or wait for repeated activity across separate threads.
7. Open a dossier when it appears.
8. Review the score breakdown, explanation bullets, evidence, replay, and timeline.
9. If action is appropriate, select specific evidence items, preview the action, read the rollback warning, confirm, and execute.
10. Check the Actions tab for item-level results.

The inline post is only a launch surface. The full dashboard opens in Expanded Mode so Reddit-native scrolling and gestures keep working normally.

For a fast test, create three posts in separate threads that repeat the same domain or phrase with small wording changes. Same-thread comments are less useful because CampaignLens is looking for cross-thread campaign shape, not ordinary conversation.

## Recommended First Test

Use a test subreddit and a harmless test domain.

Example posts:

```txt
I found this comparison useful: demo-campaign.example
```

```txt
Another useful breakdown is at demo-campaign.example.
```

```txt
People keep recommending demo-campaign dot example for this topic.
```

Expected result:

1. A dossier appears in the Dossiers tab.
2. The dossier explains repeated domain or brand signals.
3. Evidence cards show short excerpts and matched fragments.
4. The timeline shows when the related posts were detected.
5. No usernames, moderator IDs, reporter IDs, or author IDs appear.

If the dossier does not appear immediately, tap `Refresh` in the Dossiers tab and wait for the Reddit trigger logs to finish.

## How To Read A Dossier

Each dossier is a pattern, not a verdict.

- `Needs Review` means the pattern crossed the review threshold or matched enough signal families.
- `Watch` means the pattern is worth monitoring but may not need action.
- `High Confidence` is reserved for calibrated, high-scoring patterns. It still does not trigger automatic enforcement.
- The category badge describes the signal family, such as commercial promotion or possible harmful narrative.
- The total score combines several signals. It should guide review priority, not replace moderator judgment.

The most useful sections are:

- Score Breakdown: shows which signals contributed to the score.
- Why This Surfaced: explains the strongest reasons in plain language.
- Campaign Replay: shows the compact relationship between the signal and evidence.
- Evidence: shows short excerpts and matched fragments.
- Timeline: shows when mentions and obfuscation events appeared.
- Moderation Actions: lets you preview and execute selected actions only after confirmation.

## Settings Overview

Open the Settings tab to tune CampaignLens for your community. Start with defaults, then adjust slowly after reviewing real dossiers.

Default settings are intentionally moderate:

- Campaign Threshold: `40`
- High Confidence Threshold: `85`
- Required Signal Families: `3`
- Window: `60` minutes
- Evidence Cap: `10000`
- Per-Signal Cap: `50`
- Examples Per Dossier: `5`

## Detection Thresholds

### Campaign Threshold

Controls how easily a dossier appears.

- Lower values surface more dossiers.
- Higher values surface fewer dossiers.
- Recommended starting value: `40`.

Use a lower value if:

- Your subreddit is small.
- Campaigns usually appear as only a few posts.
- You are running a short review test.

Use a higher value if:

- You see too many low-value dossiers.
- Your subreddit has many repeated normal phrases.
- A common recurring event is creating noise.

### High Confidence Threshold

Controls when a dossier can be marked as higher priority.

- Recommended starting value: `85`.
- This does not create automatic enforcement.
- Keep this high unless your subreddit has a well-understood pattern.

### Required Signal Families

Controls how many independent evidence families should support a stronger review state.

Examples of signal families:

- Domain burst.
- Brand burst.
- Thread spread.
- Near-duplicate phrasing.
- Timing or participation pattern.
- Obfuscation.
- Reports.

Recommended starting value: `3`.

Lower this only for small communities. Raise it if many benign patterns repeat naturally.

### Window (minutes)

Controls how far back CampaignLens looks when grouping evidence.

- Recommended starting value: `60`.
- Use `15-30` minutes for fast-moving communities.
- Use `120-240` minutes for slower communities where campaigns unfold gradually.

## Scoring Weights

Weights control how much each signal contributes to the total score. Adjust one or two weights at a time, then observe new dossiers before changing more.

### Domain Burst

Repeated domains across posts or comments.

Increase when:

- Link campaigns are your main problem.
- Suspicious activity repeats the same website.

Decrease when:

- Your subreddit naturally repeats trusted links.
- Many normal posts cite the same official site.

### Brand Burst

Repeated brand-like phrases, names, or campaign terms.

Increase when:

- Campaigns promote a product, person, phrase, slogan, or organization without always linking.

Decrease when:

- Your community normally discusses the same named topic every day.

### Thread Spread

Activity appearing across separate threads.

Increase when:

- Cross-thread coordination is the strongest signal in your subreddit.

Decrease when:

- Your subreddit has many simultaneous threads about one normal event.

### SimHash

Near-duplicate phrasing.

Increase when:

- Campaigns reuse the same sentence structure or talking points.

Decrease when:

- Your community uses common templates, forms, or recurring weekly posts.

### Participation Pattern

Concentrated timing and low content variety.

Increase when:

- Campaigns arrive in bursts.
- Several posts look coordinated in a short window.

Decrease when:

- Normal activity regularly happens in predictable bursts, such as live events.

### Obfuscation

Signals such as `dot`, `[dot]`, `hxxp`, URL shorteners, search instructions, or affiliate parameters.

Increase when:

- Suspicious posts hide links or use evasive spelling.

Decrease when:

- Your community commonly writes domains in non-clickable form for safety.

### Reports

User reports reinforcing a pattern.

Increase when:

- Your community reports suspicious content reliably.

Decrease when:

- Reports are often used for disagreement or brigading.

## Evidence Limits

### Evidence Cap

The maximum total evidence samples CampaignLens keeps.

- Recommended default: `10000`.
- Lower this for small communities or memory pressure.
- Raise it only if diagnostics are healthy and you need longer-lived evidence volume.

### Per-Signal Cap

The maximum evidence samples kept for one repeated signal.

- Recommended default: `50`.
- Lower it if one common signal dominates storage.
- Raise it if you need larger dossiers for slow campaigns.

### Examples Per Dossier

The number of example excerpts shown in each dossier.

- Recommended default: `5`.
- Use `3-5` for quick review.
- Use `6-10` when moderators need more context before action.

## Domain Lists

List entries are case-insensitive. Add one entry per line. You can enter either the plain value, such as `example.com`, or the full signal form, such as `domain:example.com`.

### Allowlist

Use the allowlist for trusted domains or phrases that should not create dossiers.

Good allowlist examples:

```txt
reddit.com
official-community-site.example
monthly-event-name
```

Do not add a domain to the allowlist just because one dossier was benign. Use the Review feedback controls first unless the signal is genuinely trusted.

### Watchlist

Use the watchlist for domains or phrases that deserve closer review.

Watchlisted signals can surface with a lower review threshold and are more likely to be marked `Needs Review`.

Good watchlist examples:

```txt
suspicious-offer.example
repeated campaign slogan
known referral phrase
```

Keep the watchlist short. It is for known local risks, not a general bad-word list.

### Harmful Narrative Terms

Use this list for moderator-defined terms or phrases that may indicate a harmful narrative pattern when repeated across posts.

Examples:

```txt
coded slogan
violent call to action
miracle-cure
```

Important limits:

- This is term/watchlist matching, not semantic AI classification.
- A match means "review this pattern," not "this content is hateful or violent."
- Keep entries specific enough to avoid sweeping up ordinary discussion.

## Review Feedback

Use feedback after reading the dossier:

- `Watch`: keep the dossier visible for future review.
- `Ignore`: reduce priority for this dossier.
- `More`: opens additional status choices when available.

Feedback helps tune local scoring weights. It should be used after reviewing evidence, not as a substitute for moderation policy.

## Moderation Actions

CampaignLens requires manual selection and confirmation.

1. Open a dossier.
2. Scroll to Moderation Actions.
3. Select one or more evidence items.
4. Choose an action, such as `LOCK` or `UNLOCK`.
5. Click `Preview action`.
6. Review current Reddit state and skipped items.
7. Read the rollback warning.
8. Confirm.
9. Execute.
10. Open the Actions tab to verify item-level results.

Use reversible actions for testing. `LOCK` and `UNLOCK` are safest for a first real test.

## Diagnostics

The Settings tab includes diagnostics. Use it when something feels wrong.

Check:

- System health.
- Redis probe.
- Config sanity.
- Baseline mode.
- Memory caps.
- Active dossier count.
- Action history count.

Diagnostics intentionally exclude raw content, usernames, author IDs, reporter IDs, and moderator identity.

## Tuning Playbook

### Too few dossiers appear

Try these in order:

1. Confirm the repeated pattern appears across separate threads.
2. Tap Refresh in the Dossiers tab.
3. Lower Campaign Threshold by `5`.
4. Increase Window to `120` minutes.
5. Add a known local risk to Watchlist.
6. Increase the weight for the signal you expect, such as Domain Burst or Brand Burst.

Avoid dropping Campaign Threshold too far. If it is too low, moderators will spend time reviewing normal repetition.

### Too many dossiers appear

Try these in order:

1. Add trusted recurring domains or phrases to Allowlist.
2. Raise Campaign Threshold by `5`.
3. Raise Required Signal Families by `1`.
4. Lower the noisy weight, such as Brand Burst for communities centered on one topic.
5. Shorten Window if old activity is grouping with new activity.

### Dossiers are correct but not urgent enough

Try these:

1. Add the known signal to Watchlist.
2. Increase the relevant signal weight.
3. Lower High Confidence Threshold slightly only after repeated correct examples.

### Dossiers are too sparse

Try these:

1. Increase Examples Per Dossier.
2. Increase Per-Signal Cap.
3. Confirm diagnostics do not show memory pressure.

## Recommended Settings By Subreddit Type

### Small Subreddit

- Campaign Threshold: `35-40`
- Required Signal Families: `2-3`
- Window: `120`
- Examples Per Dossier: `3-5`

### Medium General Subreddit

- Campaign Threshold: `40-50`
- Required Signal Families: `3`
- Window: `60`
- Examples Per Dossier: `5`

### High-Traffic Subreddit

- Campaign Threshold: `50-60`
- Required Signal Families: `3-4`
- Window: `30-60`
- Examples Per Dossier: `5`

### Link-Heavy Subreddit

- Increase Domain Burst.
- Keep Allowlist current.
- Watch for repeated affiliate or shortened links.

### Topic-Focused Subreddit

- Decrease Brand Burst if the main topic repeats naturally.
- Increase Thread Spread, SimHash, Obfuscation, or Reports instead.

## Good Moderator Workflow

1. Start with defaults.
2. Review the first few dossiers without taking action.
3. Add obvious trusted domains to Allowlist.
4. Add only known local risks to Watchlist.
5. Tune one setting at a time.
6. Prefer reversible actions during early testing.
7. Use Actions history to verify outcomes.
8. Revisit settings after real moderator feedback.

## What Good Results Look Like

Good results are not "more dossiers." Good results are fewer, clearer dossiers that moderators can explain.

A good dossier should have:

- Multiple related examples.
- A clear repeated signal.
- Evidence across separate threads or time.
- Explanation bullets that match what moderators see.
- Enough context for a human decision.
- No need to inspect user profiles.

If a dossier cannot be explained from its evidence, tune the settings before relying on it.
