import type { AsciiFontProps } from "@opentui/react";

interface BannerProps {
  text: string;
  font?: AsciiFontProps["font"];
  maxWidth?: number;
  shadowColor?: string;
  faceColor?: string;
}

export const Banner = ({
  text,
  font: asciiFont = "block",
  maxWidth = 80,
  shadowColor = "#b5ace1",
  faceColor = "#e8dcf8",
  ...props
}: BannerProps) => {

  return (
    <box flexDirection="column" paddingBottom={2} {...props}>
      <ascii-font text={text} font={asciiFont} color={faceColor} zIndex={1} />
      <ascii-font text={text} font={asciiFont} color={shadowColor} position="absolute" left={1} top={1} zIndex={0} />
    </box>
  );
};
