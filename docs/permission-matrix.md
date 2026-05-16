# CampaignLens Permission Matrix

Last updated: May 14, 2026

CampaignLens requests and uses Reddit capabilities only for moderator-facing workflows. It does not execute enforcement from detection triggers, scores, reports, watch rules, or background jobs.

| Feature | Capability | Default |
| --- | --- | --- |
| Open launch post | Subreddit moderator menu and custom post submission | Enabled |
| Open dashboard | User-initiated Expanded Mode from the launch post | Enabled |
| Read trigger content | Devvit post/comment/report/delete trigger payloads | Enabled |
| Read current content state | Reddit API post/comment read methods | Enabled for action preview |
| Store evidence | Redis app storage | Enabled with TTLs |
| Realtime dossier updates | Devvit realtime channel `dossier_updates` | Enabled |
| Feedback status | App API and Redis feedback records | Enabled |
| Action preview | Reddit API read methods and content hydration | Enabled |
| Remove content | Reddit content moderation method | Enabled only after selected-content preview and confirmation |
| Mark spam | Reddit remove-as-spam moderation method | Enabled only after selected-content preview and confirmation |
| Approve content | Reddit approve moderation method | Enabled only after selected-content preview and confirmation |
| Lock/unlock content | Reddit lock/unlock moderation methods | Enabled only after selected-content preview and confirmation |
| Ignore reports | Reddit ignore reports moderation method | Enabled only after selected-content preview and confirmation |
| Snooze reports | Reddit snooze reports moderation method | Requires selected content, preview, confirmation, and snooze reason |
| Add removal note | Reddit removal-note method | Requires selected content, preview, confirmation, and configured reason id |
| Ban user | Subreddit moderation method | Disabled |
| Mute user | Subreddit moderation method | Disabled |
| Submit launch post as user | `SUBMIT_POST` as-user capability | Used only when a moderator explicitly opens CampaignLens |

## Guardrails

1. Every enforcement action must originate from a moderator-selected dossier item.
2. Action execution requires a draft idempotency key and explicit confirmation.
3. Item-level results are stored without moderator identity or author identity.
4. Cross-subreddit content is rejected during hydration.
5. Deleted or unavailable content is skipped instead of retried forever.
6. Ban and mute remain disabled until separate guardrails, double confirmation, and app review approval exist.
