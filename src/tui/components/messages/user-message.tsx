import type { ModeType } from "@/types";
import { useTheme } from "@/tui/providers/theme";

type Props = {
  message: string;
  mode?: ModeType;
};

export function UserMessage({ message }: Props) {
  const { colors } = useTheme();
  return (
    <box width="100%" alignItems="center" paddingBottom={1}>
      <box
        border={["left"]}
        borderStyle="heavy"
        borderColor={colors.primary}
        width="100%"
      >
        <box
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          width="100%"
        >
          <text>{message}</text>
        </box>
      </box>
    </box>
  );
}

