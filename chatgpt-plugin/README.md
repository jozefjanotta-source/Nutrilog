# Nutrilog private ChatGPT connector

This folder contains the first small ChatGPT integration for Nutrilog. Nutrilog remains the primary app and continues to own all logging and synchronization. The connector exposes these read tools:

- `get_daily_nutrition`: meals, totals and targets for one date.
- `get_latest_measurements`: latest synced body record, optionally on or before `to`.
- `get_measurement_history`: dated body records with optional `from`/`to` filters and `limit`/`offset` pagination.
- `get_weight_progress`: dated first/last values and changes for each body metric in the requested range.

Food editing is optional and disabled until the owner enables it in Nutrilog Settings. The additional tools are:

- `get_food_editing_status`: reports whether food editing is enabled, without returning credentials.
- `add_food_log`: adds one dated entry with the food, meal, portion and explicit nutrition totals.
- `update_food_log`: edits one stable entry ID after checking the revision from a fresh daily read. A portion multiplier scales all nutrition totals.

These tools do not delete entries or change targets, measurements, recovery or the food database.

## What the source inspection found

`index.html` stores data in browser `localStorage` and syncs a secret Gist file named `nutrilog.json`. The current payload is version 3 and can contain:

- targets and target history;
- food diary rows grouped by `YYYY-MM-DD` date;
- custom foods and a separate `foods.csv` Gist file;
- weight, body measurements, recovery entries, goal history, decision settings;
- deletion tombstones used by the multi-device merge.

GitHub secret Gists are unlisted, not access-controlled: anyone who obtains the URL can read an unencrypted Gist. Nutrilog therefore creates a **new** Gist and encrypts both `nutrilog.json` and `foods.csv` in the browser with AES-256-GCM before upload. The old plaintext Gist must be deleted only after the new backup and connector are verified. Reusing the old Gist is unsafe because its revision history retains plaintext.

The connector does not reuse or read browser storage. It receives the same 256-bit recovery key through a hosted secret and decrypts the fixed Gist in memory. Neither the key nor the raw decrypted payload is returned by the tool.

## Privacy boundary

The exposed `get_daily_nutrition` tool returns only:

- the requested date;
- food name, meal, amount, calories and macros for that date;
- daily totals;
- the applicable nutrition target;
- the Gist update time, so ChatGPT can warn when data may be stale.

The daily nutrition response still omits weight and measurements. The measurement tools explicitly return only dated weight, waist, body fat, fat mass, muscle mass, body water and recorded visceral fat. Missing values are null; no value is inferred. Nutrilog currently does not have a visceral-fat input, so this is normally null. Legacy weight-only diary dates are included when no body record exists for that date. Deleted measurement records are excluded, and duplicate IDs use the latest revision. Daily food reads include stable entry IDs and SHA-256 revisions so edits can identify an exact row. Measurement reads continue to omit IDs. All tools omit comments, recovery, goals, decision settings, custom foods, tombstones and raw backup data. Each metric in the progress response has its own dated endpoints and sample count; fewer than two samples yield a null change. Historical data is from the synced backup, with its update time returned when available. Tests enforce these boundaries.

## Authentication and secrets

Deploy this folder as a **private OpenAI Site** with its MCP capability enabled. Sites authenticates the ChatGPT caller. The worker adds a second check: the verified caller email must exactly equal `NUTRILOG_OWNER_EMAIL`.

Configure these hosted runtime values:

| Name | Secret? | Purpose |
| --- | --- | --- |
| `NUTRILOG_GIST_ID` | Treat as private | Selects one specific encrypted Gist; the connector never searches all Gists. |
| `NUTRILOG_ENCRYPTION_KEY` | Yes | Decrypts the AES-256-GCM envelope in memory. |
| `NUTRILOG_OWNER_EMAIL` | Treat as private | Restricts tool calls to the owner's verified ChatGPT email. |

Never put real values in this repository, an issue, a pull request, a chat message, or `.openai/hosting.json`.

Reads use one fixed Gist ID. When the owner taps **Enable ChatGPT food editing**, Nutrilog writes `nutrilog-connector-access.json`, an AES-256-GCM encrypted credential envelope using the existing recovery key. It contains the token already configured on that device and the matching Gist ID. The connector decrypts it only in memory and uses it only for the fixed Gist. Credentials are never returned by tools. A classic GitHub token with `gist` permission is supported; GitHub ultimately enforces its permissions.

**Disable editing** removes the current access file; reads and previously saved food changes remain. Revoking the token in GitHub revokes the underlying credential too. GitHub revision history can retain encrypted historical files, so disabling is not a secure erasure of historical ciphertext. Anyone with both the Gist location and recovery key can decrypt that credential: protect the recovery key as a password.

## Food edits and device sync

Each request writes only one encrypted `nutrilog-food-edit-<operation_id>.json` file. It never overwrites `nutrilog.json` or `foods.csv`. The journal preserves the entry's stable ID and adds a revision timestamp; new entries use `chatgpt-<operation_id>`. The operation ID and request hash make retries idempotent. A conflicting reuse of an operation ID is rejected. Updates require the expected SHA-256 revision, so already stale reads are rejected; this is not a distributed lock against simultaneous edits.

Both the connector and updated main app overlay these files by stable ID and latest timestamp. Deleted entries remain excluded by app tombstones, which the app now retains. Later app edits and moves win over older journal changes. The main app merges the journal during startup sync, Pull, manual Push and automatic Push. A failed remote read or journal decrypt stops a Push instead of overwriting a backup with incomplete state. ChatGPT returns updated daily totals after verifying the saved encrypted change; the device receives it on its next sync.

Concurrent updates of the same row still follow the app's latest-timestamp policy. All separate encrypted operations remain in the Gist; the tool does not claim a globally atomic compare-and-swap. The journal is bounded to 1,000 files and incomplete GitHub file lists fail clearly. No new storage service or database is used.

For 'log this food' requests, resolve ambiguous dates, foods, meals or portions before writing. Nutrition values are totals for the logged portion, not per 100g; disclose any estimates. The server validates text, dates, meal categories, numeric ranges, unexpected fields and portion scaling. Logging requests need a new unique operation ID; uncertain retries must reuse the exact same ID and arguments.

## Safe migration from the old Gist

1. Open Nutrilog on the device that contains the current diary and token.
2. In Settings, select **Create new encrypted cloud backup**.
3. Save the displayed recovery key in a password manager; do not put it in source control or chat.
4. Verify Push and Pull against the new encrypted Gist.
5. Configure and verify the private connector with the new Gist ID and recovery key.
6. Delete the old plaintext Gist only after both checks pass.

On another device, expand **Connect this device to an existing encrypted backup**, enter the new Gist ID and recovery key, save the connection, and Pull.

Large encrypted files may be marked `truncated` by GitHub's Gist API. Nutrilog follows only GitHub's expected `gist.githubusercontent.com` raw-file URL to retrieve the complete file, without forwarding the GitHub token to that host.

## Local verification

No dependencies are required. With Node.js 20 or newer:

```sh
npm test
npm run build
npm run validate
```

Connector and device-sync tests use invented fixture data. They do not contact GitHub or read the real diary. The separate browser tests check the main app and can be run with `node --test test/*.test.js` in the full Nutrilog repository.

## Sites deployment

1. Create a private Site from this `chatgpt-plugin` directory.
2. The Sites workflow adds the returned `project_id` to `.openai/hosting.json`.
3. Add the three runtime values above through the Sites secret/environment controls.
4. Build and validate the `dist` artifact, then publish privately.
5. Install or connect the private plugin created by Sites.
6. Refresh the main app on every device to receive the journal-aware sync code. In Nutrilog Settings, enable ChatGPT food editing on one connected device only if desired.
7. Test with: **“What have I eaten today?”** ChatGPT should call `get_daily_nutrition` with the user's local `YYYY-MM-DD` date.

Do not publish the Site to a wider audience. If access is intentionally shared later, replace the single-email check with a reviewed per-user data design before sharing any diary data.
