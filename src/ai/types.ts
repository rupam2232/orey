export type ActionType =
  | "create_file"
  | "modify_file"
  | "delete_file"
  | "create_folder"
  | "code_analysis"
  | "execute_shell"
  | "fetch_url";

export type ActionStatus =
  | "pending"
  | "executed"
  | "approved"
  | "rejected"
  | "reverted"
  | "failed";

export interface ActionLog {
  id: string;
  timestamp: Date;
  type: ActionType;
  path: string;
  details: {
    before?: string;
    after?: string;
    toolName?: string;
    toolResult?: string;
    error?: string;
    command?: string;
    cwd?: string;
    url?: string;
    method?: string;
    reversible?: boolean;
  };
  status: ActionStatus;
  userApproved?: boolean;
  reverted?: boolean;
}

export interface AgentConfig {
  codebasePath: string;
  excludePatterns: string[];
  tools: {
    allowShellExecution: boolean;
    allowFileModification: boolean;
    allowFileCreation: boolean;
    allowFolderCreation: boolean;
  };
}

export const defaultAgentConfig = (): AgentConfig => ({
  codebasePath: process.cwd(),
  excludePatterns: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "*.log",
    ".env*",
  ],
  tools: {
    allowShellExecution: true,
    allowFileModification: true,
    allowFileCreation: true,
    allowFolderCreation: true,
  },
});

export function isMutationType(t: ActionType): boolean {
  return (
    t === "create_file" ||
    t === "modify_file" ||
    t === "delete_file" ||
    t === "create_folder" ||
    t === "execute_shell"
  );
}
