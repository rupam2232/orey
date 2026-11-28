import { tool } from "ai";
import { z } from "zod";
import Firecrawl from "@mendable/firecrawl-js";
import type { ActionTracker } from "./action-tracker";
import type {
  ToolApprovalDecision,
  ToolApprovalHandler,
} from "./tool-approval";
import type { ToolExecutor } from "./tool-executor";
import { readConfig } from "@/lib/config";

function getClient(): Firecrawl {
  const cfg = readConfig();
  const key = cfg.firecrawlApiKey || "";
  if (!key)
    throw new Error(
      "Firecrawl API key not configured. Use '/web' command to set it.",
    );
  if (cfg.webSearchEnabled === false)
    throw new Error("Web search is disabled. Use '/web' command to enable it.");
  return new Firecrawl({ apiKey: key });
}

function clip(s: string, n = 8000): string {
  return s.length > n ? s.slice(0, n) + "\n…[truncated]" : s;
}

export function createWebTools(
  tracker: ActionTracker,
  requestApproval: ToolApprovalHandler,
) {
  return {
    web_search: tool({
      description: "Search the web. Returns title/url/snippet list.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Search query"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe("Maximum number of results to return"),
      }),
      execute: async ({ query, limit }) => {
        const res = await getClient().search(query, {
          limit,
          sources: ["web"],
        });

        const items = (res.web ?? []).slice(0, limit);

        const out =
          items
            .map((d, i) => {
              const title = ("title" in d && d.title) || "(untitled)";
              const url = ("url" in d && d.url) || "";
              const snip = ("snippet" in d && d.snippet) || "";
              return `${i + 1}. ${title}\n   ${url}\n   ${snip}`;
            })
            .join("\n\n") || "(no result)";

        tracker.log({
          type: "code_analysis",
          path: `web_search:${query}`,
          details: { after: out, toolName: "web_search" },
          status: "executed",
        });

        return clip(out);
      },
    }),

    web_crawl: tool({
      description: "Scrape a URL into markdown text.",
      inputSchema: z.object({
        url: z.string().url().describe("URL to scrape"),
      }),
      execute: async ({ url }) => {
        const doc = await getClient().scrape(url, { formats: ["markdown"] });
        const md = (doc as { markdown?: string }).markdown ?? "";
        tracker.log({
          type: "code_analysis",
          path: `web_crawl:${url}`,
          details: { after: clip(md), toolName: "web_crawl" },
          status: "executed",
        });
        return clip(md) || "(empty)";
      },
    }),

    fetch_url: tool({
      description: "HTTP request to a URL. Returns response body.",
      inputSchema: z.object({
        url: z.string().url().describe("The URL to fetch"),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
          .optional()
          .default("GET")
          .describe("HTTP method to use"),
      }),
      execute: async ({ url, method }, { toolCallId, abortSignal }) => {
        const decision = await requestApproval({
          toolName: "fetch_url",
          toolCallId,
          url,
          method,
          signal: abortSignal,
        });
        if (!decision.approved) {
          return "The user rejected this fetch_url request. It was not executed.";
        }

        try {
          const r = await fetch(url, {
            redirect: "follow",
            method,
            signal: abortSignal,
          });
          const body = await r.text();
          const out = `HTTP ${r.status}\n\n${clip(body, 16_000)}`;
          tracker.updateDetails(decision.action.id, { toolResult: out });
          tracker.updateStatus(decision.action.id, "executed", true);
          return out;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          tracker.updateDetails(decision.action.id, { error: message });
          tracker.updateStatus(decision.action.id, "failed", true);
          throw error;
        }
      },
    }),
  };
}

export function createAgentTools(
  executor: ToolExecutor,
  requestApproval: ToolApprovalHandler,
) {
  return {
    read_file: tool({
      description:
        "Read a text file from the workspace. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path"),
      }),
      execute: async ({ path: p }) => executor.readFile(p),
    }),

    create_file: tool({
      description:
        "Create a new file with the given content. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path"),
        content: z.string().describe("Content to write to the file"),
      }),
      execute: async ({ path: p, content }) => executor.createFile(p, content),
    }),

    modify_file: tool({
      description:
        "A full-file replacement for an existing file. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path"),
        content: z.string().describe("Complete new file contents"),
      }),
      execute: async ({ path: p, content }) => executor.modifyFile(p, content),
    }),

    delete_file: tool({
      description: "Delete a file. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path"),
      }),
      execute: async ({ path: p }) => executor.deleteFile(p),
    }),

    create_folder: tool({
      description:
        "Create a directory tree (folder). Uses mkdir -p on apply. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative directory path"),
      }),
      execute: async ({ path: p }) => executor.createFolder(p),
    }),

    list_files: tool({
      description:
        "List files and directories under a path. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative directory path"),
        recursive: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to list files recursively"),
      }),
      execute: async ({ path: p, recursive }) =>
        executor.listFiles(p, recursive),
    }),

    search_files: tool({
      description:
        'Find files matching a glob pattern (e.g. "*.ts", "**/*.md"). Optional content substring filter.',
      inputSchema: z.object({
        root: z.string().describe("Directory to search, relative to root"),
        pattern: z
          .string()
          .describe("Glob-like pattern using * and ** (forward slashes)"),
        content_contains: z
          .string()
          .optional()
          .describe(
            `Optional substring to filter files by content. Supports these file types: ${Array.from(executor.textExtensions()).join(", ")}`,
          ),
      }),
      execute: async ({ root, pattern, content_contains }) =>
        executor.searchFiles(root, pattern, content_contains),
    }),

    analyze_codebase: tool({
      description:
        "Summarize structure: file counts, directory counts, size. Read-only.",
      inputSchema: z.object({
        path: z
          .string()
          .default(".")
          .describe("Path to analyze, relative to project root"),
      }),
      execute: async ({ path: p }) => executor.analyzeCodebase(p),
    }),

    execute_shell: tool({
      description:
        "Run a shell command in the workspace after the user approves this invocation. Use with care.",
      inputSchema: z.object({
        command: z.string().describe("Single command; runs with shell: true"),
      }),
      execute: async ({ command }, { toolCallId, abortSignal }) => {
        if (!executor.shellExecutionAllowed) {
          throw new Error("Shell execution disabled");
        }
        const decision: ToolApprovalDecision = await requestApproval({
          toolName: "execute_shell",
          toolCallId,
          command,
          cwd: executor.workspacePath,
          signal: abortSignal,
        });
        if (!decision.approved) {
          return "The user rejected this execute_shell request. It was not executed.";
        }
        return executor.executeShell(command, decision.action, abortSignal);
      },
    }),

    list_skills: tool({
      description:
        "List absolute paths to SKILL.md files under configured skill directories (Cursor / Claude).",
      inputSchema: z.object({}),
      execute: async () => executor.listSkills(),
    }),

    read_skill: tool({
      description:
        "Read a SKILL.md file. Path must be absolute and under skill roots, or use a path returned by list_skills.",
      inputSchema: z.object({
        path: z.string().describe("Absolute path to SKILL.md file"),
      }),
      execute: async ({ path: p }) => executor.readSkill(p),
    }),
  };
}
