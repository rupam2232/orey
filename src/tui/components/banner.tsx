import type { AsciiFontProps } from "@opentui/react";
import { useTheme } from "../providers/theme";

interface BannerProps {
  text: string;
  font?: AsciiFontProps["font"];
  maxWidth?: number;
}

export const Banner = ({
  text,
  font: asciiFont = "block",
  maxWidth = 80,
  ...props
}: BannerProps) => {
  const { colors } = useTheme();

  return (
    <box flexDirection="column" paddingBottom={2} {...props}>
      <ascii-font text={text} font={asciiFont} color={colors.primary} zIndex={1} />
      <ascii-font text={text} font={asciiFont} color={colors.secondary} position="absolute" left={1} top={1} zIndex={0} />
    </box>
  );
};
