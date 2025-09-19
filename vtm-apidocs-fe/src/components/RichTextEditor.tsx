import { useEffect, useMemo, useRef } from "react";
import SunEditor from "suneditor-react";

import "suneditor/dist/css/suneditor.min.css";

type RichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
};

function normalizeContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed === "<p><br></p>") return "";
  return content;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight = 160,
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) return;
    if (disabled) instance.disabled();
    else instance.enabled();
  }, [disabled]);

  const options = useMemo(
    () => ({
      mode: "classic" as const,
      minHeight: `${minHeight}px`,
      height: "auto",
      resizingBar: false,
      showPathLabel: false,
      buttonList: [
        ["undo", "redo"],
        ["font", "fontSize", "formatBlock"],
        ["bold", "underline", "italic", "strike", "removeFormat"],
        ["fontColor", "hiliteColor"],
        ["align", "list", "lineHeight"],
        ["table", "link", "image"],
        ["codeView", "preview", "fullScreen"],
      ],
      defaultStyle: "font-size:14px; line-height:1.6;",
    }),
    [minHeight]
  );

  return (
    <SunEditor
      key={disabled ? "disabled" : "enabled"}
      getSunEditorInstance={(instance) => {
        editorRef.current = instance;
      }}
      setOptions={options}
      setContents={value || ""}
      onChange={(content) => {
        if (disabled) return;
        onChange(normalizeContent(content));
      }}
      placeholder={placeholder}
      autoFocus={false}
    />
  );
}
