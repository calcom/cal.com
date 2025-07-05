"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  TypeaheadOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { LexicalEditor } from "lexical";
import { TextNode } from "lexical";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import { VariableNode, $createVariableNode } from "../nodes/VariableNode";

function $findAndTransformVariable(node: TextNode): null | TextNode {
  const text = node.getTextContent();

  const regex = /\{[^}]+\}/g; // Regular expression to match {VARIABLE_NAME <whatever>}
  let match;

  // Iterate over the text content
  for (let i = 0; i < text.length; i++) {
    regex.lastIndex = i; // Set the regex search position to the current index
    match = regex.exec(text);

    if (match !== null) {
      const matchedText = match[0]; // The entire matched text {VARIABLE_NAME <whatever here>}
      const matchIndex = match.index; // Start index of the matched text

      // Ensure that we move the loop index past the current match
      i = matchIndex + matchedText.length - 1;

      let targetNode;
      if (matchIndex === 0) {
        [targetNode] = node.splitText(matchIndex + matchedText.length);
      } else {
        [, targetNode] = node.splitText(matchIndex, matchIndex + matchedText.length);
      }
      const variableNode = $createVariableNode(matchedText);
      targetNode.replace(variableNode);
      return variableNode;
    }
  }

  return null;
}

function useVariablesTransform(editor: LexicalEditor): void {
  useEffect(() => {
    if (!editor.hasNodes([VariableNode])) {
      console.error("VariableNode is not registered in the editor");
      return;
    }
    return editor.registerNodeTransform(TextNode, (node) => {
      let targetNode: TextNode | null = node;

      while (targetNode !== null) {
        if (!targetNode.isSimpleText()) {
          return;
        }
        targetNode = $findAndTransformVariable(targetNode);
      }
    });
  }, [editor]);
}

class VariableTypeaheadOption extends TypeaheadOption {
  name: string;
  constructor(name: string) {
    super(name);
    this.name = name;
  }
}

interface AddVariablesPluginProps {
  variables: string[];
}

export default function AddVariablesPlugin({ variables }: AddVariablesPluginProps): JSX.Element | null {
  const { t } = useLocale();
  const [editor] = useLexicalComposerContext();
  useVariablesTransform(editor);

  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("{", {
    minLength: 0,
  });

  const options = useMemo(() => {
    return variables
      .filter((variable) => variable.toLowerCase().includes(queryString?.toLowerCase() ?? ""))
      .map((result) => new VariableTypeaheadOption(result));
  }, [variables, queryString]);

  const onSelectOption = useCallback(
    (selectedOption: VariableTypeaheadOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const variableNode = $createVariableNode(
          `{${t(`${selectedOption.name}_variable`).toUpperCase().replace(/ /g, "_")}}`
        );
        if (nodeToReplace) {
          nodeToReplace.replace(variableNode);
        }
        variableNode.select();
        closeMenu();
      });
    },
    [editor, t]
  );

  return (
    <LexicalTypeaheadMenuPlugin<VariableTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef.current && options.length
          ? createPortal(
              <div
                className={classNames(
                  "shadow-dropdown bg-default border-subtle mt-5 w-64 overflow-hidden rounded-md border",
                  "typeahead-popover" // class required by Lexical
                )}>
                <ul className="max-h-64 list-none overflow-y-scroll md:max-h-80">
                  {options.map((option, index) => (
                    <li
                      id={`typeahead-item-${index}`}
                      key={option.key}
                      aria-selected={selectedIndex === index}
                      tabIndex={-1}
                      className="focus:ring-brand-800 hover:bg-subtle hover:text-emphasis text-default aria-selected:bg-subtle aria-selected:text-emphasis cursor-pointer px-4 py-2 text-sm outline-none ring-inset transition first-of-type:rounded-t-[inherit] last-of-type:rounded-b-[inherit] focus:outline-none focus:ring-1"
                      ref={option.setRefElement}
                      role="option"
                      onClick={() => {
                        setHighlightedIndex(index);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(index);
                      }}>
                      <p className="text-sm font-semibold">
                        {`{${t(`${option.name}_variable`).toUpperCase().replace(/ /g, "_")}}`}
                      </p>
                      <span className="text-default text-sm">{t(`${option.name}_info`)}</span>
                    </li>
                  ))}
                </ul>
              </div>,
              anchorElementRef.current
            )
          : null
      }
    />
  );
}
