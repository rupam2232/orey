import { TextAttributes } from "@opentui/core";

type Props = {
  type: "create_file" | "modify_file" | "delete_file" | "create_folder";
  path: string;
  patch?: string;
};

const FILETYPE_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".md": "markdown",
  ".css": "css",
  ".html": "html",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
};

function filetypeFor(path: string): string | undefined {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? undefined : FILETYPE_BY_EXT[path.slice(dot).toLowerCase()];
}

export function CodeOutput({ type, path, patch }: Props) {
  if (type === "create_folder") {
    return (
      <box>
        <text attributes={TextAttributes.DIM}>Created folder: {path}</text>
      </box>
    );
  }

  return (
    <box width="100%">
      <diff
        diff={patch ?? ""}
        filetype={filetypeFor(path)}
        wrapMode="word"
        showLineNumbers
        view="unified"
        width="100%"
      />
    </box>
  );
}
