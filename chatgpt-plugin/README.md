# Nutrilog read-only ChatGPT connector

This folder contains the first small ChatGPT integration for Nutrilog. Nutrilog remains the primary app and continues to own all logging and synchronization. The connector performs one operation only:

> Read the meals, totals, and nutrition target for one requested date.

It cannot add, edit, delete, or synchronize Nutrilog data.

## What the source inspection found

`index.html` stores data in browser `localStorage` and syncs a private Gist file named `nutrilog.json`. The current payload is version 3 and can contain:

- targets and target history;
- food diary rows grouped by `YYYY-MM-DD` date;
- custom foods and a separate `foods.csv` Gist file;
- weight, body measurements, recovery entries, goal history, decision settings;
- deletion tombstones used by the multi-device merge.

The existing app sends this snapshot to GitHub from the browser with a Personal Access Token. The connector does not reuse or read that browser storage. Its credential is configured separately as a hosted server secret.

## Privacy boundary

The exposed `get_daily_nutrition` tool returns only:

- the requested date;
- food name, meal, amount, calories and macros for that date;
- daily totals;
- the applicable nutrition target;
- the Gist update time, so ChatGPT can warn when data may be stale.

The response deliberately omits row IDs, row update timestamps, weight, measurements, recovery, goals, decision settings, custom foods, tombstones, and the raw Gist payload. Tests enforce this boundary.

## Authentication and secrets

Deploy this folder as a **private OpenAI Site** with its MCP capability enabled. Sites authenticates the ChatGPT caller. The worker adds a second check: the verified caller email must exactly equal `NUTRILOG_OWNER_EMAIL`.

Configure these hosted runtime values:

| Name | Secret? | Purpose |
| --- | --- | --- |
| `GITHUB_GIST_TOKEN` | Yes | Reads the private Gist through GitHub's API. |
| `NUTRILOG_GIST_ID` | Treat as private | Selects one specific Gist; the connector never searches all Gists. |
| `NUTRILOG_OWNER_EMAIL` | Treat as private | Restricts tool calls to the owner's verified ChatGPT email. |

Never put real values in this repository, an issue, a pull request, a chat message, or `.openai/hosting.json`.

GitHub currently requires a classic Personal Access Token with the `gist` scope to access a private Gist. GitHub does not provide a read-only private-Gist scope, so the token is technically write-capable at GitHub. This connector reduces that risk by issuing only `GET` requests, targeting one fixed Gist ID, never exposing the token to the browser or tool response, and keeping the Site private. For best isolation, create a separate token for this connector and rotate/revoke it independently from the token used in Nutrilog.

## Local verification

No dependencies are required. With Node.js 20 or newer:

```sh
npm test
npm run build
npm run validate
```

Tests use invented fixture data. They do not contact GitHub or read the real diary.

## Sites deployment

1. Create a private Site from this `chatgpt-plugin` directory.
2. The Sites workflow adds the returned `project_id` to `.openai/hosting.json`.
3. Add the three runtime values above through the Sites secret/environment controls.
4. Build and validate the `dist` artifact, then publish privately.
5. Install or connect the private plugin created by Sites.
6. Test with: **“What have I eaten today?”** ChatGPT should call `get_daily_nutrition` with the user's local `YYYY-MM-DD` date.

Do not publish the Site to a wider audience. If access is intentionally shared later, replace the single-email check with a reviewed per-user data design before sharing any diary data.
