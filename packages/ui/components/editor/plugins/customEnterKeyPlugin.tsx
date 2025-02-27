"use client";

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
