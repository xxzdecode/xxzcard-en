# Vocabulary lesson completion receipts

Codex must create one JSON receipt per completed vocabulary visual lesson:

```text
<lessonId>.json
```

Required fields:

```json
{
  "schemaVersion": 1,
  "lessonId": "<lessonId>",
  "sourceWordbook": "<wordbook name>",
  "status": "completed",
  "sceneImageCount": 0,
  "imagesPassed": 0,
  "qaPassed": true,
  "visualCommitSha": "<commit containing the visual assets and data>",
  "completedAt": "<ISO 8601 timestamp>"
}
```

Create the receipt only after all required images are imported, mappings and counts are verified, website visual data is updated, checks pass, and the visual-content commit exists.

Do not use a single overwriteable `latest.json`. Do not create a completed receipt for missing images, failed checks, or an uncommitted visual update.
