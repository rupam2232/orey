import { useEffect, useState } from "react";
import type { ModeType } from "../../types";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type SpinnerProps = {
  mode?: ModeType;
};

export function Spinner({ mode = "agent" }: SpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <text>{SPINNER_FRAMES[frameIndex]}</text>;
}
