"use client";

import { cn } from "@calid/features/lib/cn";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

import { templateVariablePlugin } from "./templateVariablePlugin";
import { variablePickerPanel } from "./variablePickerPanel";

export interface CodeEditorProps {
  /** Current value - controlled */
  value: string;
  /** Called on every change with the new string value */
  onChange: (value: string) => void;
  /** "html" uses @codemirror/lang-html, "json" uses @codemirror/lang-json */
  language: "html" | "json";
  /** Editor height. Default: "300px" */
  height?: string;
  /** When true, editor is read-only and visually dimmed */
  readOnly?: boolean;
  /** Placeholder shown when value is empty */
  placeholder?: string;
  /** Additional className applied to the wrapper div */
  className?: string;
  /**
   * List of variable keys to show in the picker panel.
   * Each key is displayed and inserted as {key}.
   * When undefined or empty, the picker panel is not rendered.
   */
  variables?: string[];
}

export const CodeEditor = ({
  value,
  onChange,
  language,
  height = "300px",
  readOnly = false,
  placeholder,
  className,
  variables,
}: CodeEditorProps) => {
  const extensions = useMemo(() => {
    const langExtension = language === "html" ? html() : json();

    return [
      langExtension,
      ...templateVariablePlugin,
      EditorView.lineWrapping,
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
      ...(variables && variables.length > 0 ? [variablePickerPanel(variables)] : []),
    ];
  }, [language, readOnly, variables]);

  return (
    <div className={cn("overflow-hidden rounded-md border", readOnly && "opacity-60", className)}>
      <CodeMirror
        value={value}
        height={height}
        extensions={extensions}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          autocompletion: false,
          searchKeymap: false,
        }}
        theme="light"
      />
    </div>
  );
};
