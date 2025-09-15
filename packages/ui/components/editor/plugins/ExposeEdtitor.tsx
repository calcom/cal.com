import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalEditor } from "lexical";

export default function ExposeEditorPlugin({
  onReady,
}: {
  onReady?: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    onReady?.(editor);
  }, [editor, onReady]);
  return null;
}
