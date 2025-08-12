"use client";

import { $isListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createLineBreakNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
} from "lexical";
import { useEffect } from "react";

const CustomEnterKeyPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeEnterCommand = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: any) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();

          if ($isListItemNode(anchorNode) || $isListItemNode(anchorNode.getParent())) {
            return false; // Don't prevent default - let Lexical handle list behavior
          }

          event.preventDefault();
          const lineBreakNode = $createLineBreakNode();
          selection.insertNodes([lineBreakNode]);
          return true;
        }
        return false; // any failure case of not selection
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeEnterCommand();
    };
  }, [editor]);

  return null;
};

export default CustomEnterKeyPlugin;
