"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { useEffect } from "react";

type PlainTextPluginProps = {
  setText: (text: string) => void;
  plainText: boolean;
};

export default function PlainTextPlugin({ setText, plainText }: PlainTextPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        if (plainText) {
          const textContent = $getRoot().getTextContent();
          setText(textContent);
        }
      });
    });
  }, [plainText]);

  return null;
}
