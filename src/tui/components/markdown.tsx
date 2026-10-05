import { useMemo } from "react";
import { SyntaxStyle } from "@opentui/core";
import { useTheme } from "../providers/theme";

type MarkdownProps = {
  content: string;
  streaming?: boolean;
};

export function useMarkdownSyntaxStyle() {
  const { colors } = useTheme();

  return useMemo(
    () =>
      SyntaxStyle.fromStyles({
        default: { fg: colors.markdownText ?? colors.primary },
        comment: {
          fg: colors.markdownQuote ?? colors.secondary,
          italic: true,
        },
        "string": { fg: colors.markdownCode ?? colors.secondary },
        "number": { fg: colors.markdownEmphasis ?? colors.secondary },
        "boolean": { fg: colors.markdownEmphasis ?? colors.secondary },
        "keyword": { fg: colors.markdownHeading ?? colors.primary },
        "function": { fg: colors.markdownLink ?? colors.secondary },
        "type": { fg: colors.markdownList ?? colors.secondary },
        "variable": { fg: colors.markdownText ?? colors.primary },
        "operator": { fg: colors.markdownLink ?? colors.secondary },
        "punctuation": { fg: colors.markdownText ?? colors.primary },
        "markup.heading": {
          fg: colors.markdownHeading ?? colors.primary,
          bold: true,
        },
        "markup.strong": {
          fg: colors.markdownStrong ?? colors.primary,
          bold: true,
        },
        "markup.italic": {
          fg: colors.markdownEmphasis ?? colors.secondary,
          italic: true,
        },
        "markup.strikethrough": {
          fg: colors.secondary,
          dim: true,
        },
        "markup.list": { fg: colors.markdownList ?? colors.secondary },
        "markup.quote": {
          fg: colors.markdownQuote ?? colors.secondary,
          italic: true,
        },
        "markup.raw": { fg: colors.markdownCode ?? colors.secondary },
        "markup.link": {
          fg: colors.markdownLink ?? colors.secondary,
          underline: true,
        },
        "markup.link.url": {
          fg: colors.markdownLink ?? colors.secondary,
          underline: true,
        },
        "markup.link.label": {
          fg: colors.markdownLink ?? colors.secondary,
        },
      }),
    [colors],
  );
}

export function Markdown({ content, streaming = false }: MarkdownProps) {
  const syntaxStyle = useMarkdownSyntaxStyle();
  const { colors } = useTheme();

  return (
    <markdown
      content={content}
      syntaxStyle={syntaxStyle}
      fg={colors.markdownText ?? colors.primary}
      conceal
      streaming={streaming}
      width="100%"
    />
  );
}
