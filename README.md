# Orey

> A developer assistant CLI and bot that can plan tasks, run autonomous agents, and answer codebase questions. Supports interactive CLI, Telegram bot mode, and web-enabled research tools.

## Features

- Interactive CLI with `agent`, `plan`, and `ask` modes
- Telegram bot for remote interaction and approvals
- Plan generation that outputs short, actionable steps
- Agent tooling to propose and (with approval) apply code changes
- Web search, crawl and fetch integration (optional, via Firecrawl)

## Quickstart

Prerequisites

- Bun (required)

## Environment Variables

- `OPENROUTER_API_KEY` (required) — API key for the OpenRouter provider used by the AI model.
- `OPENROUTER_DEFAULT_MODEL` (optional) — Model id to use (defaults to `openrouter/free`).
- `FIRECRAWL_API_KEY` (optional) — Enables `web_search`, `web_crawl`, and `fetch_url` tools.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OWNER_ID` — Required to run the Telegram bot mode.

Install dependencies

Using Bun:

```bash
bun install
```

Run the app (CLI)

With Bun (runs TypeScript directly):

```bash
bun index.ts
```

The startup menu will show interactive modes. From there choose `CLI` or `Telegram`.

Run the Telegram bot

1. Ensure the required environment variables are set (see the "Environment Variables" section above).

2. Start the app and select `Telegram` from the startup menu, or run the bot process directly:

```bash
bun index.ts
```

The bot will send a welcome message to the owner and begin listening for commands.

## Modes & Commands

- CLI Modes
	- `agent`: Run an autonomous agent that can propose and apply changes (approval required before applying).
	- `plan`: Generate a short plan (1–15 steps) for a user goal and optionally execute selected steps.
	- `ask`: Ask questions about the repository and optionally save answers as markdown notes.

- Telegram Commands
	- `/ask <question>` — Ask a question and receive a researched answer
	- `/agent <task>` — Run the agent on a task (approval UI provided)
	- `/plan <goal>` — Generate a plan and interactively select steps to execute

## Contributing

Contributions welcome. Please open issues for bugs or feature requests and send pull requests for review.