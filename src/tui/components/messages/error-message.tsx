import { TextAttributes } from "@opentui/core";

type Props = {
  message: string;
};

export function ErrorMessage({ message }: Props) {

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
          <text attributes={TextAttributes.DIM}>
            {message}
          </text>
        </box>
      </box>
    </box>
  );
}

