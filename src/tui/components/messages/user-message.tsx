import type { ModeType } from "@/types";

type Props = {
  message: string;
  mode?: ModeType;
};

export function UserMessage({ message, mode = "agent" }: Props) {
  return (
    <box width="100%" alignItems="center" paddingBottom={1}>
      <box
        border={["left"]}
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

