import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import type { AgentConfig, ActionLog } from "./types";
import { ActionTracker } from "./action-tracker";

type ApplyChangesInput = Pick<ActionLog, "type" | "path"> & {
  before?: string;
  after?: string;
};

export class ToolExecutor {
  private overlay = new Map<string, string>();
  private deleted = new Set<string>();
  private shellProcesses = new Map<ChildProcess, ActionLog>();
  private readonly norm = (rel: string) =>
    path.posix.normalize(rel.split(path.sep).join("/")).replace(/^\.\//, "");

  constructor(
    private readonly tracker: ActionTracker,
    private config: AgentConfig,
  ) {}

  updateConfig(config: AgentConfig): void {
    this.config = config;
  }

  get workspacePath(): string {
    return this.config.codebasePath;
  }

  get shellExecutionAllowed(): boolean {
    return this.config.tools.allowShellExecution;
  }

  private resolveSafe(rel: string): string {
    const abs = path.resolve(this.config.codebasePath, rel);
    const root = path.resolve(this.config.codebasePath);
    const relCheck = path.relative(root, abs);
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      throw new Error(`Path escapes workspace: ${rel}`);
    }
    return abs;
  }

  private excluded(relPath: string): boolean {
    const norm = this.norm(relPath);
    const segments = norm.split("/");
    const base = segments[segments.length - 1] ?? "";

    for (const pat of this.config.excludePatterns) {
      if (pat === "*.log" && base.endsWith(".log")) return true;
      if (pat === ".env*" && base.startsWith(".env")) return true;
      if (pat.includes("*")) continue;
      if (segments.includes(pat) || norm === pat || norm.startsWith(`${pat}/`))
        return true;
    }
    return false;
  }

  private assertNotExcluded(rel: string, op: string): void {
    if (this.excluded(rel)) {
      throw new Error(`${op}: path is excluded by policy: ${rel}`);
    }
  }

  private isProbablyTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.textExtensions().has(ext) || ext === "";
  }

  textExtensions() {
    return new Set([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".json",
      ".md",
      ".mdx",
      ".css",
      ".html",
      ".yml",
      ".yaml",
      ".toml",
      ".txt",
    ]);
  }

  getEffectiveText(rel: string): string | undefined {
    const key = this.norm(rel);
    if (this.deleted.has(key)) return undefined;
    if (this.overlay.has(key)) return this.overlay.get(key);
    const abs = this.resolveSafe(rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return undefined;
    return fs.readFileSync(abs, "utf8");
  }

  readFile(rel: string): string {
    this.assertNotExcluded(rel, "read_file");
    const abs = this.resolveSafe(rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      throw new Error(`File not found: ${rel}`);
    }
    const text = fs.readFileSync(abs, "utf8");
    this.tracker.log({
      type: "code_analysis",
      path: this.norm(rel),
      details: { after: text, toolName: "read_file" },
      status: "executed",
    });
    return text;
  }

  createFile(rel: string, content: string): string {
    if (!this.config.tools.allowFileCreation) {
      throw new Error("File creation disabled");
    }
    this.assertNotExcluded(rel, "create_file");
    const key = this.norm(rel);
    const abs = this.resolveSafe(rel);
    if (fs.existsSync(abs)) {
      throw new Error(`create_file: already exists: ${rel}`);
    }
    this.applyChanges({ type: "create_file", path: key, after: content });
    return `Created new file: ${key}`;
  }

  modifyFile(rel: string, content: string): string {
    if (!this.config.tools.allowFileModification) {
      throw new Error("File modification disabled");
    }
    this.assertNotExcluded(rel, "modify_file");
    const before = this.getEffectiveText(rel);
    if (before === undefined) {
      throw new Error(`modify_file: file not found: ${rel}`);
    }
    const key = this.norm(rel);
    this.applyChanges({
      type: "modify_file",
      path: key,
      before,
      after: content,
    });
    this.overlay.set(key, content);
    return `Modified file: ${key}`;
  }

  deleteFile(rel: string): string {
    if (!this.config.tools.allowFileModification) {
      throw new Error("File deletion disabled");
    }
    this.assertNotExcluded(rel, "delete_file");
    const before = this.getEffectiveText(rel);
    if (before === undefined) {
      throw new Error(`delete_file: file not found: ${rel}`);
    }
    const key = this.norm(rel);
    this.overlay.delete(key);
    this.deleted.add(key);
    this.applyChanges({ type: "delete_file", path: key, before });
    return `Deleted file: ${key}`;
  }

  createFolder(rel: string): string {
    if (!this.config.tools.allowFolderCreation) {
      throw new Error("Folder creation disabled");
    }
    this.assertNotExcluded(rel, "create_folder");
    const key = this.norm(rel);
    const existed = fs.existsSync(this.resolveSafe(rel));
    const action = this.applyChanges({
      type: "create_folder",
      path: key,
      after: key,
    });
    if (action.type === "create_folder" && action.path === key) {
      action.details.reversible = !existed;
    }
    return `Created folder: ${key}`;
  }

  listFiles(rel: string, recursive: boolean): string {
    this.assertNotExcluded(rel, "list_files");
    const abs = this.resolveSafe(rel);
    if (!fs.existsSync(abs)) throw new Error(`list_files: not found: ${rel}`);

    const lines: string[] = [];
    const walk = (dir: string, prefix: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        const relP = path.relative(this.config.codebasePath, full);
        if (this.excluded(relP)) continue;
        if (ent.isDirectory()) {
          lines.push(`${prefix}${ent.name}/`);
          if (recursive) walk(full, `${prefix}${ent.name}/`);
        } else {
          lines.push(`${prefix}${ent.name}`);
        }
      }
    };

    if (fs.statSync(abs).isDirectory()) {
      walk(abs, "");
    } else {
      lines.push(path.relative(this.config.codebasePath, abs));
    }

    const out = lines.sort().join("\n");
    this.tracker.log({
      type: "code_analysis",
      path: this.norm(rel),
      details: { after: out, toolName: "list_files" },
      status: "executed",
    });
    return out || "(empty)";
  }

  searchFiles(
    rootRel: string,
    globPattern: string,
    contentQuery?: string,
  ): string {
    this.assertNotExcluded(rootRel, "search_files");
    const rootAbs = this.resolveSafe(rootRel);
    if (!fs.existsSync(rootAbs)) {
      throw new Error(`search_files: root not found: ${rootRel}`);
    }

    const results: string[] = [];
    const regexFromGlob = (g: string): RegExp => {
      const escaped = g
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "§§")
        .replace(/\*/g, "[^/\\\\]*")
        .replace(/§§/g, ".*")
        .replace(/\?/g, ".");
      return new RegExp(`^${escaped}$`, "i");
    };
    const nameRe = regexFromGlob(globPattern.replace(/\\/g, "/"));

    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        const relP = path
          .relative(this.config.codebasePath, full)
          .split(path.sep)
          .join("/");
        if (this.excluded(relP)) continue;
        if (ent.isDirectory()) {
          walk(full);
        } else if (nameRe.test(relP) || nameRe.test(ent.name)) {
          if (contentQuery) {
            if (!this.isProbablyTextFile(full)) continue;
            const text = fs.readFileSync(full, "utf8");
            if (!text.includes(contentQuery)) continue;
          }
          results.push(relP);
        }
      }
    };

    if (fs.statSync(rootAbs).isDirectory()) {
      walk(rootAbs);
    } else {
      const relP = path
        .relative(this.config.codebasePath, rootAbs)
        .split(path.sep)
        .join("/");
      results.push(relP);
    }

    const out = [...new Set(results)].sort().join("\n");
    this.tracker.log({
      type: "code_analysis",
      path: this.norm(rootRel),
      details: { after: out || "(no matches)", toolName: "search_files" },
      status: "executed",
    });
    return out || "(no matches)";
  }

  analyzeCodebase(rootRel: string): string {
    const rootAbs = this.resolveSafe(rootRel);
    if (!fs.existsSync(rootAbs)) {
      throw new Error(`analyze_codebase: not found: ${rootRel}`);
    }

    let files = 0;
    let dirs = 0;
    let size = 0;
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        const relP = path.relative(this.config.codebasePath, full);
        if (this.excluded(relP)) continue;
        if (ent.isDirectory()) {
          dirs++;
          walk(full);
        } else {
          files++;
          size += fs.statSync(full).size;
        }
      }
    };
    if (fs.statSync(rootAbs).isDirectory()) {
      walk(rootAbs);
    } else {
      files = 1;
      size = fs.statSync(rootAbs).size;
    }

    const summary = `Files: ${files} | Directories: ${dirs} | Size: ${size} bytes`;
    this.tracker.log({
      type: "code_analysis",
      path: this.norm(rootRel),
      details: { after: summary, toolName: "analyze_codebase" },
      status: "executed",
    });
    return summary;
  }

  executeShell(
    command: string,
    action: ActionLog,
    signal?: AbortSignal,
  ): Promise<string> {
    if (!this.config.tools.allowShellExecution) {
      throw new Error("Shell execution disabled");
    }
    if (signal?.aborted) {
      const error = new Error("Shell execution interrupted");
      this.tracker.updateDetails(action.id, { error: error.message });
      this.tracker.updateStatus(action.id, "failed", true);
      throw error;
    }

    const child = spawn(command, {
      cwd: action.details.cwd ?? this.config.codebasePath,
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.shellProcesses.set(child, action);
    const maxOutputLength = 16_000;
    let stdout = "";
    let stderr = "";
    let outputTruncated = false;
    const capture = (current: string, chunk: Buffer): string => {
      const remaining = maxOutputLength - current.length;
      if (remaining <= 0) {
        outputTruncated = true;
        return current;
      }
      const text = chunk.toString("utf8");
      if (text.length > remaining) outputTruncated = true;
      return current + text.slice(0, remaining);
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = capture(stdout, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = capture(stderr, chunk);
    });

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        child.kill();
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      child.once("error", (error) => {
        this.shellProcesses.delete(child);
        signal?.removeEventListener("abort", onAbort);
        this.tracker.updateDetails(action.id, { error: error.message });
        this.tracker.updateStatus(action.id, "failed", true);
        reject(error);
      });

      child.once("close", (code, terminationSignal) => {
        this.shellProcesses.delete(child);
        signal?.removeEventListener("abort", onAbort);
        if (signal?.aborted) {
          const error = new Error("Shell execution interrupted");
          this.tracker.updateDetails(action.id, { error: error.message });
          this.tracker.updateStatus(action.id, "failed", true);
          reject(error);
          return;
        }

        const output = [
          `Exit code: ${code ?? "unknown"}${terminationSignal ? ` (${terminationSignal})` : ""}`,
          `stdout:\n${stdout || "(empty)"}`,
          `stderr:\n${stderr || "(empty)"}`,
          outputTruncated ? "[output truncated]" : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        this.tracker.updateDetails(action.id, { toolResult: output });
        this.tracker.updateStatus(action.id, "executed", true);
        resolve(output);
      });
    });
  }

  skillRoots(): string[] {
    return [
      path.join(homedir(), ".cursor/skills-cursor"),
      path.join(homedir(), ".claude/skills"),
    ];
  }

  listSkills(): string {
    const lines: string[] = [];
    for (const root of this.skillRoots()) {
      if (!fs.existsSync(root)) continue;
      const walk = (dir: string) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) walk(full);
          else if (ent.name === "SKILL.md") lines.push(full);
        }
      };
      walk(root);
    }
    const out = lines.sort().join("\n");
    this.tracker.log({
      type: "code_analysis",
      path: "skills",
      details: { after: out || "(none)", toolName: "list_skills" },
      status: "executed",
    });
    return out || "(none)";
  }

  readSkill(skillPath: string): string {
    const abs = path.isAbsolute(skillPath)
      ? path.normalize(skillPath)
      : path.normalize(path.resolve(this.config.codebasePath, skillPath));
    const allowed = this.skillRoots().some((root) => {
      const r = path.resolve(root);
      return abs === r || abs.startsWith(r + path.sep);
    });
    if (!allowed) throw new Error("read_skill: outside skill roots");
    const text = fs.readFileSync(abs, "utf8");
    this.tracker.log({
      type: "code_analysis",
      path: abs,
      details: { after: text, toolName: "read_skill" },
      status: "executed",
    });
    return text;
  }

  private applyChanges({ type, path: p, before, after }: ApplyChangesInput) {
    try {
      if (type === "create_folder") {
        fs.mkdirSync(this.resolveSafe(p), { recursive: true });
      }

      if (
        type === "create_file" ||
        type === "modify_file" ||
        type === "delete_file"
      ) {
        if (type === "delete_file")
          fs.rmSync(this.resolveSafe(p), { force: true });
        else {
          const target = this.resolveSafe(p);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, after ?? "", "utf8");
        }
      }

      return this.tracker.log({
        type,
        path: p,
        details: { after, before, toolName: type },
        status: "executed",
      });
    } catch (e) {
      throw new Error(String(e));
    }
  }

  clearStaging(): void {
    this.overlay.clear();
    this.deleted.clear();
  }

  shutdown(): void {
    for (const [child, action] of this.shellProcesses) {
      this.tracker.updateDetails(action.id, {
        error: "Application closed while the approved command was running.",
      });
      this.tracker.updateStatus(action.id, "failed", true);
      if (child.exitCode === null && !child.killed) child.kill();
    }
    this.shellProcesses.clear();
  }

  revertAction(actionId: string): string {
    const action = this.tracker.getActions().find((item) => item.id === actionId);
    if (!action) throw new Error(`Revert unavailable: action not found: ${actionId}`);
    if (!action.reverted) {
      if (
        action.type === "create_file" ||
        action.type === "modify_file" ||
        action.type === "delete_file"
      ) {
        this.revertFileAction(action);
      } else if (action.type === "create_folder") {
        this.revertFolderAction(action);
      } else {
        throw new Error(`Revert unavailable for ${action.type}`);
      }
    }

    this.tracker.markReverted(action.id);
    return `Reverted ${action.type}: ${action.path}`;
  }

  private revertFileAction(action: ActionLog): void {
    const abs = this.resolveSafe(action.path);
    const key = this.norm(action.path);
    const current = fs.existsSync(abs) && fs.statSync(abs).isFile()
      ? fs.readFileSync(abs, "utf8")
      : undefined;
    const before = action.details.before;
    const after = action.details.after;

    if (action.type === "create_file") {
      if (current !== after) {
        throw new Error(`Cannot revert ${action.path}: file changed since the AI action`);
      }
      fs.rmSync(abs);
      this.overlay.delete(key);
      this.deleted.add(key);
      return;
    }

    if (action.type === "modify_file") {
      if (current !== after) {
        throw new Error(`Cannot revert ${action.path}: file changed since the AI action`);
      }
      fs.writeFileSync(abs, before ?? "", "utf8");
      this.overlay.set(key, before ?? "");
      this.deleted.delete(key);
      return;
    }

    if (current !== undefined) {
      throw new Error(`Cannot revert ${action.path}: file was recreated or changed`);
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, before ?? "", "utf8");
    this.overlay.set(key, before ?? "");
    this.deleted.delete(key);
  }

  private revertFolderAction(action: ActionLog): void {
    if (action.details.reversible !== true) {
      throw new Error(`Cannot revert ${action.path}: folder existed before the AI action`);
    }
    const abs = this.resolveSafe(action.path);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      throw new Error(`Cannot revert ${action.path}: folder is missing`);
    }
    if (fs.readdirSync(abs).length > 0) {
      throw new Error(`Cannot revert ${action.path}: folder is not empty`);
    }
    fs.rmdirSync(abs);
  }
}
