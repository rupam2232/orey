import { useMemo } from "react";
import { SyntaxStyle } from "@opentui/core";

type MarkdownProps = {
  content: string;
  streaming?: boolean;
};

const MARKDOWN_SYNTAX_STYLE = SyntaxStyle.fromStyles({
  "markup.heading": { fg: "#00ff00", bold: true },
  "markup.strong": { fg: "#ffffff", bold: true },
  "markup.italic": { fg: "#cccccc", italic: true },
  "markup.strikethrough": { fg: "#888888", dim: true },
  "markup.list": { fg: "#00ffff" },
  "markup.quote": { fg: "#888888", italic: true },
  "markup.raw": { fg: "#00ffff" },
  "markup.link": { fg: "#00ffff", underline: true },
  "markup.link.url": { fg: "#00ffff", underline: true },
  "markup.link.label": { fg: "#00ffff" },
});

export function useMarkdownSyntaxStyle() {
  return useMemo(() => MARKDOWN_SYNTAX_STYLE, []);
}

export function Markdown({ content, streaming = false }: MarkdownProps) {
  const syntaxStyle = useMarkdownSyntaxStyle();

  return (
    <markdown
      content={content}
      syntaxStyle={syntaxStyle}
      conceal
      streaming={streaming}
      width="100%"
    />
  );
}
