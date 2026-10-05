import { TextAttributes } from "@opentui/core";
import { Children, type ReactNode } from "react";
import { Spinner } from "./spinner";
import { usePromptConfig } from "../providers/prompt-config";
import { TextArea } from "./textarea";
import { useTheme } from "../providers/theme";

declare const OREY_VERSION: string | undefined;
const version = typeof OREY_VERSION === "string" ? OREY_VERSION : "dev";

type Props = {
  children?: ReactNode;
  onSubmit: (text: string) => void;
  inputDisabled?: boolean;
  loading?: boolean;
  interruptible?: boolean;
};

export function SessionShell({
  children,
  onSubmit,
  inputDisabled = false,
  loading = false,
  interruptible = false,
}: Props) {
  const { mode } = usePromptConfig();
  const { colors } = useTheme();

  const cleanChildren = Children.toArray(children).filter(
    (child) => typeof child !== "string",
  );

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      width="100%"
      height="100%"
      backgroundColor={colors.background}
      paddingY={1.5}
      paddingX={2}
      gap={1}
    >
      <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom" scrollbarOptions={{ visible: false }}>
        <box>{cleanChildren}</box>
      </scrollbox>
      <box flexShrink={0}>
        <TextArea onSubmit={onSubmit} disabled={inputDisabled} />
      </box>
      <box
        width="100%"
        gap={2}
      >
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <box
          flexDirection="row"
          alignItems="center"
            gap={2}>
            {loading ? (
              <>
                <Spinner mode={mode} />
                {interruptible ? <text>esc to interrupt</text> : null}
              </>
            ) : <text attributes={TextAttributes.DIM}>{process.cwd()}</text>}
          </box>
          <text attributes={TextAttributes.DIM}>v{version}</text>
        </box>
      </box>
    </box>
  );
}

