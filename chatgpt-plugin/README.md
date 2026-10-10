# Nutrilog read-only ChatGPT connector

This folder contains the first small ChatGPT integration for Nutrilog. Nutrilog remains the primary app and continues to own all logging and synchronization. The connector exposes four read-only tools:

- `get_daily_nutrition`: meals, totals and targets for one date.
- `get_latest_measurements`: latest synced body record, optionally on or before `to`.
- `get_measurement_history`: dated body records with optional `from`/`to` filters and `limit`/`offset` pagination.
- `get_weight_progress`: dated first/last values and changes for each body metric in the requested range.

It cannot add, edit, delete, or synchronize Nutrilog data.

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

The daily nutrition response still omits weight and measurements. The measurement tools explicitly return only dated weight, waist, body fat, fat mass, muscle mass, body water and recorded visceral fat. Missing values are null; no value is inferred. Nutrilog currently does not have a visceral-fat input, so this is normally null. Legacy weight-only diary dates are included when no body record exists for that date. Deleted measurement records are excluded, and duplicate IDs use the latest revision. All tools omit IDs, comments, recovery, goals, decision settings, custom foods, tombstones and raw backup data. Each metric in the progress response has its own dated endpoints and sample count; fewer than two samples yield a null change. Historical data is from the synced backup, with its update time returned when available. Tests enforce this boundary.

## Authentication and secrets

Deploy this folder as a **private OpenAI Site** with its MCP capability enabled. Sites authenticates the ChatGPT caller. The worker adds a second check: the verified caller email must exactly equal `NUTRILOG_OWNER_EMAIL`.

Configure these hosted runtime values:

| Name | Secret? | Purpose |
| --- | --- | --- |
| `NUTRILOG_GIST_ID` | Treat as private | Selects one specific encrypted Gist; the connector never searches all Gists. |
| `NUTRILOG_ENCRYPTION_KEY` | Yes | Decrypts the AES-256-GCM envelope in memory. |
| `NUTRILOG_OWNER_EMAIL` | Treat as private | Restricts tool calls to the owner's verified ChatGPT email. |

Never put real values in this repository, an issue, a pull request, a chat message, or `.openai/hosting.json`.

The connector stores no GitHub token. It performs unauthenticated `GET` requests for one fixed Gist ID, so it has no GitHub credential with which to create, edit, or delete data. The encrypted payload remains confidential if somebody learns the Gist URL. Nutrilog itself still keeps its existing GitHub token locally in the browser so the primary app can synchronize updates.

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

Connector tests use invented fixture data. They do not contact GitHub or read the real diary. The separate `test/browser-gist-file.test.js` checks the main app and can be run with `node --test test/*.test.js` in the full Nutrilog repository.

## Sites deployment

1. Create a private Site from this `chatgpt-plugin` directory.
2. The Sites workflow adds the returned `project_id` to `.openai/hosting.json`.
3. Add the three runtime values above through the Sites secret/environment controls.
4. Build and validate the `dist` artifact, then publish privately.
5. Install or connect the private plugin created by Sites.
6. Test with: **“What have I eaten today?”** ChatGPT should call `get_daily_nutrition` with the user's local `YYYY-MM-DD` date.

Do not publish the Site to a wider audience. If access is intentionally shared later, replace the single-email check with a reviewed per-user data design before sharing any diary data.
