---
name: nutrilog-food-logging
description: Log or correct food in Nutrilog from text, photos or nutrition labels, save reusable foods, and review complete diary weeks.
---

Use the installed Nutrilog connector. Resolve the user's local date, meal and portion. Search the live registry before inventing nutrition values. Preserve grams, ml and per-piece units, and distinguish raw, cooked and as-sold basis. Do not convert raw to cooked nutrition without a matching definition.

For a photo, identify visible food and labels; ask about portion weight, hidden oil or sauces when materially uncertain. Prefer a visible readable label or matching live registry record. Label visual meal estimates estimated and retain a short source note with assumptions. Show the proposed entry and uncertainty before saving an ambiguous estimate. Do not claim a photo reveals exact weight or macros.

Save only when the user asks to log food. Use registry revisions with log_registered_food, or portion totals with add_food_log. Save reusable foods with save_food_to_registry only when requested. Reuse the exact operation ID and arguments after uncertain saves; never create a new operation to retry.

Read current entry revisions before corrections and Undo. Resolve duplicate names. Refuse stale edits; re-read before retrying. Confirm saved results without exposing credentials or backup contents.

Mark a day complete only on the user's explicit confirmation that all food is logged. Complete-day averages exclude partial and missing days. Use get_weekly_review for Saturday-Friday intake and dated weight/waist context; BIA readings alone do not establish tissue gain or loss.
