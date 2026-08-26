import { useRef } from "react";
import type { TextareaRenderable } from "@opentui/core";

interface TextAreaProps {
  initialValue?: string;
  minHeight?: number;
  width?: number;
  focused?: boolean;
  onSubmit: (text: string) => void;
}

export function TextArea({
  initialValue = "",
  minHeight = 6,
  width = 60,
  focused = true,
  onSubmit,
  ...props
}: TextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null);

  function handleSubmit() {
    const text = textareaRef.current?.plainText.trim() ?? "";
    onSubmit(text);
    textareaRef.current?.clear();
  }

  return (
    <box alignItems="center" width="100%">
      <box
        borderStyle="rounded"
        borderColor="transparent"
        backgroundColor="#1d1d1d"
        minHeight={minHeight}
        width="100%"
      >
        <textarea
          placeholder="Type your message here..."
          ref={textareaRef}
          focused={focused}
          width={width}
          height={minHeight}
          initialValue={initialValue}
          wrapMode="word"
          scrollMargin={2}
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "enter", action: "submit" },
            { name: "return", shift: true, action: "newline" },
            { name: "enter", shift: true, action: "newline" },
          ]}
          onSubmit={handleSubmit}
          {...props}
        />
      </box>
    </box>
  );
}
