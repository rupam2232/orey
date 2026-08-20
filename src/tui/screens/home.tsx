import { useCallback } from "react";
import { Banner } from "../components/banner";
import { TextArea } from "../components/textarea";
import { useNavigate } from "react-router";
import { usePromptConfig } from "../providers/prompt-config";

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
    </box>
  );
};
