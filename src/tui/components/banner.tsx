import { TextAttributes } from "@opentui/core";
import figlet from "figlet";

interface BannerProps {
  text: string;
  font?: string;
  maxWidth?: number;
  shadowColor?: string;
  faceColor?: string;
}

export const Banner = ({
  text,
  font = "ANSI Shadow",
  maxWidth = 80,
  shadowColor = "#5b4d9e",
  faceColor = "#e8dcf8",
  ...props
}: BannerProps) => {
  let ascii: string;
  try {
    ascii = figlet.textSync(text, { font, width: maxWidth });
  } catch {
    ascii = figlet.textSync(text, { font: "Standard", width: maxWidth });
  }

  const lines = ascii
    .replace(/\s+$/, "")
    .split("\n")
    .filter((line) => line.trim());

  return (
    <box flexDirection="column" height={lines.length + 2} {...props}>
      {lines.map((line, index) => (
        <text
          key={`face-${index}`}
          fg={faceColor}
          attributes={TextAttributes.BOLD}
        >
          {line}
        </text>
      ))}
    </box>
  );
};
