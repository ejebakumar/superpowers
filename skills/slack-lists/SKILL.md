---
name: slack-lists
description: Use when the user asks to create a Slack List, add rows to one, or programmatically manage a structured Slack List (not a Canvas or bullet message), or shares a slack.com/lists/... URL.
---

# Slack Lists Skill

Create and manage Slack Lists — the structured, columnar lists at `slack.com/lists/<team>/<file_id>`. These are distinct from Canvases and from message bullet lists.

The current Slack MCP server does **not** expose `slackLists.*` methods, so this skill drives a local CLI under `tools/slack-lists/` that calls the Slack Web API directly.

## When to Use

- User wants to create a Slack List (todo-mode or custom schema).
- User wants to bulk-add rows to an existing List.
- User shares a `slack.com/lists/...` URL and asks to create a similar one.
- User asks "can you create a Slack list like X" — clarify if they mean a List (structured), a Canvas (doc), or a bullet message.

## Prerequisites

1. Paid Slack plan (Pro / Business+ / Enterprise Grid).
2. User token (`xoxp-...`) with scopes `lists:write` and `lists:read`.
3. Token exported:

   ```bash
   export SLACK_USER_TOKEN=xoxp-...
   ```

If `$SLACK_USER_TOKEN` isn't set, STOP and ask the user to create a Slack app with the `lists:write` + `lists:read` user-token scopes and export the token. Do not attempt to create one with a bot token — `slackLists.create` requires a user token.

## Tool Files

Located in `tools/slack-lists/`:

| File | Purpose |
|------|---------|
| `slack_lists.py` | Primary CLI (stdlib Python, no deps) |
| `slack_lists.sh` | curl + jq equivalent |
| `example_schema.json` | Sample custom column schema |
| `README.md` | Full docs |

## Common Workflows

### Create a todo-mode list

Built-in Completed / Assignee / Due Date columns.

```bash
python tools/slack-lists/slack_lists.py create-todo --name "Sprint Tasks"
```

Capture `list.id` (starts with `F`) and the primary text `column_id` (starts with `Col`) from the response.

### Create a list with a custom schema

```bash
python tools/slack-lists/slack_lists.py create \
  --name "Bug Tracker" \
  --schema tools/slack-lists/example_schema.json
```

Supported column types: `text`, `date`, `user`, `select`, `number`, `checkbox`, `email`, `phone`, `rating`, `channel`, `attachment`, `message`. Mark one column `"is_primary_column": true`.

### Add items

Single:

```bash
python tools/slack-lists/slack_lists.py add-item \
  --list-id F0XXXXXX --column-id Col10000000 --text "Fix login crash"
```

Bulk (one item per line in a text file):

```bash
python tools/slack-lists/slack_lists.py add-items \
  --list-id F0XXXXXX --column-id Col10000000 --items todos.txt
```

### Inspect

```bash
python tools/slack-lists/slack_lists.py columns --list-id F0XXXXXX
python tools/slack-lists/slack_lists.py items   --list-id F0XXXXXX
```

## Sharing the List

The Lists API does not return a fully-formed share URL beyond the `file_id`. To share into a DM/channel, send a message containing the URL:

```
https://degreed.slack.com/lists/<team_id>/<list_id>
```

Use the existing `mcp__plugin_slack_slack__slack_send_message` MCP tool to post that URL into the desired channel.

## Pitfalls

- **Text must be rich_text.** Both scripts already wrap text correctly — don't pass raw strings to the API yourself.
- **No `schema` + `copy_from_list_id` together.** Pick one.
- **Bot tokens don't work** for `slackLists.create`. Use a user token.
- **Rate limits + item caps:** 1,000 items (Pro/Business+), 5,000 (Enterprise Grid).

## References

- `tools/slack-lists/README.md` — full local docs
- [`slackLists.create`](https://docs.slack.dev/reference/methods/slackLists.create/)
- [`slackLists.items.create`](https://docs.slack.dev/reference/methods/slackLists.items.create/)
- [Lists API launch (2025-09-02)](https://docs.slack.dev/changelog/2025/09/02/list-api/)
