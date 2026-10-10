# Nutrilog experience update

## Implemented
- Automatic encrypted pull on startup, foreground return, reconnect and visible one-minute checks. Queued push/pull avoids overlapping syncs; pending local saves remain visible and persist across reloads.
- Live food-registry search, reusable food creation and logging using reference units and current revisions. Grams and millilitres stay distinct. Raw/cooked/as-sold basis and label/database/estimated/user provenance are retained.
- Photo-log prompt handoff in Add food. Attach photos in ChatGPT; estimates carry assumptions. The app does not perform automatic image recognition.
- Full food correction dialog and Undo for app additions, corrections, deletions, copies and moves; connector undo guards current revisions. Existing legacy corrections without a before snapshot require explicit correction.
- Explicit day completion invalidates when food content changes. Intake averages exclude partial and missing days.
- Saturday review for the preceding Saturday-Friday week, with coverage, complete-day intake, recorded targets and dated weight/waist observations.

## Rollout
The app source and connector source must both be released. Preserve the existing owner-private Site project, App and plugin IDs. Deploy the connector through the Sites source helper from the matching worker source; do not create another backup or replace the current encrypted diary. A refresh loads the app changes on each device. New connector tools may require a new ChatGPT conversation.

## Verification
Run `node --test chatgpt-plugin/test/*.test.js` on Node 22, then the connector build and artifact validation. Tests use encrypted fixtures only; no real diary writes are required. Do device/browser QA when the coding environment is restored. This source preparation does not mean production deployment has completed.
