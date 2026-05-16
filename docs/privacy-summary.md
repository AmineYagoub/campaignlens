# CampaignLens Privacy Summary

Last updated: May 14, 2026

CampaignLens is designed as an evidence-first moderator tool. It detects campaign-shaped patterns inside the installed subreddit and avoids user profiling.

## Stored Data

- Short evidence excerpts from submitted posts/comments.
- Matched domains, brand-like phrases, obfuscation flags, timestamps, content ids, and thread ids.
- Campaign category labels derived from deterministic signals and moderator-configured terms.
- Dossier scores and explanation metadata.
- Feedback records such as watch, ignore, benign, false positive, confirmed, and escalated.
- Action drafts and action execution records with item-level status.
- Configuration values such as thresholds, weights, allowlist, and watchlist.

## Not Stored

- Author usernames in analytics records.
- Moderator usernames in action history.
- Reporter identity.
- User trust scores.
- Account profiles or cross-community account history.
- External AI embeddings or external service payloads.
- Raw full post/comment bodies beyond the short evidence excerpt.

## Deletion Behavior

When Reddit delete triggers are received, CampaignLens marks the content id as deleted, removes the stored evidence sample, removes content-to-evidence indexes, and redacts matching dossier examples where possible.

If content becomes unavailable between preview and execution, the action executor skips that item and stores an item-level skipped result.

## External Services

CampaignLens does not send evidence or user data to external AI providers. Detection is deterministic and runs inside the Devvit app environment.
