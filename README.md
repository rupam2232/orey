<h1 align="center">Orey</h1>

<p align="center">
  <b>The open-source, local AI coding agent for the terminal.</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/orey-ai"><img src="https://img.shields.io/npm/v/orey-ai" alt="npm version" /></a>
  <a href="https://github.com/rupam2232/orey/blob/main/LICENSE"><img src="https://img.shields.io/github/license/rupam2232/orey" alt="License" /></a>
  <a href="https://github.com/rupam2232/orey/actions/workflows/publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/rupam2232/orey/publish.yml" alt="Build status" /></a>
  <a href="https://github.com/sponsors/rupam2232"><img src="https://img.shields.io/badge/sponsor-rupam2232-ea4aaa?logo=github-sponsors" alt="Sponsor"/></a>
</p>

Orey is a terminal-native AI coding agent for understanding repositories, planning implementation work, and making changes with explicit approval.

It combines read-only codebase intelligence, structured planning, and an agent that can inspect files, edit code, and execute approved commands.

## Highlights

- Terminal-first workflow built with OpenTUI.
- Agent mode for repository work with approval-gated actions.
- Plan mode for structured implementation planning.
- Ask mode for read-only codebase questions.
- OpenRouter model selection from inside the terminal UI.
- Optional Firecrawl web search, crawling, and URL fetching.
- Persistent local sessions and configuration under `~/.orey`.
- Native binaries for Linux, macOS, and Windows.

## Installation & Setup

### npm

The npm package is named `orey-ai`. The command is named `orey`:

```bash
npm install -g orey-ai
orey --version #ensure that orey is installed correctly
```

The package installs the native binary for your operating system and CPU architecture automatically.

### GitHub Releases

You can also download a standalone binary from the [releases page](https://github.com/rupam2232/orey/releases).

| Platform | Archive |
|----------|---------|
| Linux x64 | `orey-linux-x64.tar.gz` |
| Linux ARM64 | `orey-linux-arm64.tar.gz` |
| Linux x64 musl | `orey-linux-x64-musl.tar.gz` |
| Linux ARM64 musl | `orey-linux-arm64-musl.tar.gz` |
| macOS Intel | `orey-darwin-x64.zip` |
| macOS Apple Silicon | `orey-darwin-arm64.zip` |
| Windows x64 | `orey-windows-x64.zip` |
| Windows ARM64 | `orey-windows-arm64.zip` |

Extract the archive and run the binary:

```bash
./orey
```

Release archives are standalone binaries, not operating-system installers. To run `orey` from any directory, place the extracted binary in a directory on your `PATH`.

### From source

For development, install [Bun](https://bun.sh/) and run Orey directly from the repository:

```bash
git clone https://github.com/rupam2232/orey.git
cd orey
bun install
bun run dev
```

## Update

Use the same installation method you originally chose.

For npm:

```bash
npm install --global orey-ai@latest
```

For a standalone release, download and extract the newest archive from the [releases page](https://github.com/rupam2232/orey/releases), then replace the existing binary on your `PATH`.

Verify the installed version:

```bash
orey --version
```

## Usage

Start Orey from inside the repository you want to work on:

```bash
cd path/to/project
orey
```

On the first run:

1. Type `/models` to open model settings.
2. Select **OpenRouter**.
3. Enter your OpenRouter API key.
4. Choose a model.
5. Return to the prompt and describe what you want to do.

Orey stores local configuration in:

```text
~/.orey/config.json
```

Local sessions are stored in:

```text
~/.orey/sessions/
```

## Modes

Orey includes three focused modes:

| Mode | Use it for |
|------|------------|
| **Agent** | Inspect files, propose edits, and run commands with approval |
| **Plan** | Turn a goal into a short, structured implementation plan |
| **Ask** | Ask read-only questions about a repository |

Use `/modes` to switch modes.

## Commands

Type `/` in the prompt to open the command menu.

```text
/new       Start a new session
/modes     Switch between Agent, Plan, and Ask modes
/models    Configure the provider, API key, and model
/web       Configure Firecrawl web access
/sessions  Browse previous local sessions
/exit      Quit Orey
```

## Model Provider

Orey currently supports [OpenRouter](https://openrouter.ai/), which provides access to a wide selection of hosted and open models through one API.

Create an API key at [openrouter.ai/keys](https://openrouter.ai/keys), then configure it with `/models`.

Orey retrieves the available models from OpenRouter so you can choose the model used by the application.

## Web Access

Web access is optional and disabled by default. It adds web search, crawling, and URL fetching through [Firecrawl](https://www.firecrawl.dev/).

1. Create a Firecrawl API key.
2. Open `/web` in Orey.
3. Enter the key.
4. Press `Alt+W` to enable or disable web access.

Without a Firecrawl key, Orey continues to work for local codebase tasks.

## CLI Options

```bash
orey --help
orey --version
```

Run `orey` without an option to open the interactive terminal interface.

## Configuration & Privacy

Orey is free to use. There is no Orey subscription, usage fee, or hosted account. You bring your own provider credentials and pay the provider directly for whatever usage your provider account incurs.

Privacy is a core part of Orey:

- **Your keys, your accounts:** You provide and manage your own AI provider and optional Firecrawl API keys.
- **Local storage:** Configuration and session data are stored locally under `~/.orey`.
- **No Orey backend:** Orey does not send your data to an Orey-owned server, private database, or hosted storage service.
- **No tracking:** Orey does not include analytics, telemetry, or usage tracking.
- **Explicit model requests:** Repository content and prompts leave your machine only when they are needed for a request to the AI model you selected. Model providers then handles that data under its own policies.
- **Optional web requests:** Web search, crawling, and URL fetching are disabled by default. When enabled, those requests use your Firecrawl account and are subject to Firecrawl's policies.

Orey does not silently collect or retain your project data. Keep `~/.orey/config.json` private because it contains your API credentials.

## Releases

Orey releases publish two distribution forms:

- `orey-ai` on npm, with platform-specific optional binary packages.
- Standalone platform archives on GitHub Releases.

The npm package installs the correct native binary automatically. Release archives are standalone binaries that users can place on their `PATH`.

## Contributing

Issues and pull requests are welcome. Please include a clear description of the change and how you verified it.

## License

Orey is released under the [MIT License](LICENSE).
