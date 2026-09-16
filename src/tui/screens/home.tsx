import { useCallback } from "react";
import { Banner } from "../components/banner";
import { TextArea } from "../components/textarea";
import { useNavigate } from "react-router";
import { usePromptConfig } from "../providers/prompt-config";
import { TextAttributes } from "@opentui/core";

declare const OREY_VERSION: string | undefined;
const version = typeof OREY_VERSION === "string" ? OREY_VERSION : "dev";

export const Home = () => {
  const navigate = useNavigate();
  const promptConfig = usePromptConfig();

  const handleSubmit = useCallback(
    (text: string) => {
      navigate("/sessions/new", {
        state: {
          message: text,
          mode: promptConfig.mode,
          model: promptConfig.model,
          cwd: process.cwd(),
        },
      });
    },
    [navigate, promptConfig],
  );

  return (
    <box
      alignItems="center"
      justifyContent="center"
      height="100%"
      width="100%"
      flexGrow={1}
      gap={2}
      position="relative"
      backgroundColor="#0f0f0f"
    >
      <Banner text="orey" />
      <box width="100%" maxWidth={80}>
        <TextArea onSubmit={handleSubmit} />
      </box>
      <box
        width="100%"
        position="absolute"
        bottom={0.5}
        paddingX={2}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <text attributes={TextAttributes.DIM}>{process.cwd()}</text>
        <text attributes={TextAttributes.DIM}>v{version}</text>
      </box>
    </box>
  );
};
