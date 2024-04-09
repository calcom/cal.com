import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $isAtNodeEnd, $wrapNodes } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import classNames from "classnames";
import type { EditorState, GridSelection, LexicalEditor, NodeSelection, RangeSelection } from "lexical";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "../../..";
import { Button } from "../../button";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../form/dropdown";
import type { TextEditorProps } from "../Editor";
import { AddVariablesDropdown } from "./AddVariablesDropdown";

const LowPriority = 1;

const supportedBlockTypes = new Set(["paragraph", "h1", "h2", "ul", "ol"]);

interface BlockType {
  [key: string]: string;
}

const blockTypeToBlockName: BlockType = {
  paragraph: "Normal",
  ol: "Numbered List",
  ul: "Bulleted List",
  h1: "Large Heading",
  h2: "Small Heading",
};

function positionEditorElement(editor: HTMLInputElement, rect: DOMRect | null) {
  if (rect === null) {
    editor.style.opacity = "0";
    editor.style.top = "-1000px";
    editor.style.left = "-1000px";
  } else {
    editor.style.opacity = "1";
    editor.style.top = `${rect.top + rect.height + window.pageYOffset + 10}px`;
    editor.style.left = `${rect.left + window.pageXOffset - editor.offsetWidth / 2 + rect.width / 2}px`;
  }
}

function FloatingLinkEditor({ editor }: { editor: LexicalEditor }) {
  const editorRef = useRef<HTMLInputElement>(null);
  const mouseDownRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [isEditMode, setEditMode] = useState(true);
  const [lastSelection, setLastSelection] = useState<RangeSelection | NodeSelection | GridSelection | null>(
    null
  );

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL());
      } else {
        setLinkUrl("");
      }
    }
    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (editorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      !nativeSelection?.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection?.anchorNode || null)
    ) {
      const domRange = nativeSelection?.getRangeAt(0);
      let rect: DOMRect | undefined;
      if (nativeSelection?.anchorNode === rootElement) {
        let inner: Element = rootElement;
        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange?.getBoundingClientRect();
      }
      if (!mouseDownRef.current) {
        positionEditorElement(editorElem, rect || null);
      }

      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== "link-input") {
      positionEditorElement(editorElem, null);
      setLastSelection(null);
      setEditMode(false);
      setLinkUrl("");
    }

    return true;
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }: { editorState: EditorState }) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return true;
        },
        LowPriority
      )
    );
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  return (
    <div ref={editorRef} className="link-editor">
      {isEditMode ? (
        <input
          ref={inputRef}
          className="link-input"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (lastSelection !== null) {
                if (linkUrl !== "") {
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
                }
                setEditMode(false);
              }
            } else if (event.key === "Escape") {
              event.preventDefault();
              setEditMode(false);
            }
          }}
        />
      ) : (
        <>
          <div className="link-input">
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              {linkUrl}
            </a>
            <div
              className="link-edit"
              role="button"
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setEditMode(true);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

export default function ToolbarPlugin(props: TextEditorProps) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [blockType, setBlockType] = useState("paragraph");
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  const formatParagraph = () => {
    if (blockType !== "paragraph") {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapNodes(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatLargeHeading = () => {
    if (blockType !== "h1") {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapNodes(selection, () => $createHeadingNode("h1"));
        }
      });
    }
  };

  const formatSmallHeading = () => {
    if (blockType !== "h2") {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapNodes(selection, () => $createHeadingNode("h2"));
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== "ul") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== "ol") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const format = (newBlockType: string) => {
    switch (newBlockType) {
      case "paragraph":
        formatParagraph();
        break;
      case "ul":
        formatBulletList();
        break;
      case "ol":
        formatNumberedList();
        break;
      case "h1":
        formatLargeHeading();
        break;
      case "h2":
        formatSmallHeading();
        break;
    }
  };

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getTag() : element.getTag();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          setBlockType(type);
        }
      }
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }
    }
  }, [editor]);

  const addVariable = (variable: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        editor.update(() => {
          const formatedVariable = `{${variable.toUpperCase().replace(/ /g, "_")}}`;
          selection?.insertRawText(formatedVariable);
        });
      }
    });
  };

  useEffect(() => {
    if (!props.firstRender) {
      editor.update(() => {
        const root = $getRoot();
        if (root) {
          editor.update(() => {
            const parser = new DOMParser();
            // Create a new TextNode
            const dom = parser.parseFromString(props.getText(), "text/html");

            const nodes = $generateNodesFromDOM(editor, dom);
            const paragraph = $createParagraphNode();
            root.clear().append(paragraph);
            paragraph.select();
            $insertNodes(nodes);
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.updateTemplate]);

  useEffect(() => {
    if (props.setFirstRender) {
      props.setFirstRender(false);
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(props.getText(), "text/html");

        const nodes = $generateNodesFromDOM(editor, dom);

        $getRoot().select();
        $insertNodes(nodes);

        editor.registerUpdateListener(({ editorState, prevEditorState }) => {
          editorState.read(() => {
            const textInHtml = $generateHtmlFromNodes(editor).replace(/&lt;/g, "<").replace(/&gt;/g, ">");
            props.setText(
              textInHtml.replace(
                /<p\s+class="editor-paragraph"[^>]*>\s*<br>\s*<\/p>/g,
                "<p class='editor-paragraph'></p>"
              )
            );
          });
          if (!prevEditorState._selection) editor.blur();
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          updateToolbar();
          return false;
        },
        LowPriority
      )
    );
  }, [editor, updateToolbar]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  if (!props.editable) return <></>;
  return (
    <div className="toolbar flex" ref={toolbarRef}>
      <>
        {!props.excludedToolbarItems?.includes("blockType") && supportedBlockTypes.has(blockType) && (
          <>
            <Dropdown>
              <DropdownMenuTrigger className="text-subtle">
                <>
                  <span className={`icon${blockType}`} />
                  <span className="text text-default hidden sm:flex">
                    {blockTypeToBlockName[blockType as keyof BlockType]}
                  </span>
                  <Icon name="chevron-down" className="text-default ml-2 h-4 w-4" />
                </>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.keys(blockTypeToBlockName).map((key) => {
                  return (
                    <DropdownMenuItem key={key} className="outline-none hover:ring-0 focus:ring-0">
                      <Button
                        color="minimal"
                        type="button"
                        onClick={() => format(key)}
                        className={classNames(
                          "w-full rounded-none focus:ring-0",
                          blockType === key ? "bg-subtle w-full" : ""
                        )}>
                        <>
                          <span className={`icon block-type ${key}`} />
                          <span>{blockTypeToBlockName[key]}</span>
                        </>
                      </Button>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </Dropdown>
          </>
        )}

        <>
          {!props.excludedToolbarItems?.includes("bold") && (
            <Button
              color="minimal"
              variant="icon"
              type="button"
              StartIcon="bold"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
              }}
              className={isBold ? "bg-subtle" : ""}
            />
          )}
          {!props.excludedToolbarItems?.includes("italic") && (
            <Button
              color="minimal"
              variant="icon"
              type="button"
              StartIcon="italic"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
              }}
              className={isItalic ? "bg-subtle" : ""}
            />
          )}
          {!props.excludedToolbarItems?.includes("link") && (
            <>
              <Button
                color="minimal"
                variant="icon"
                type="button"
                StartIcon="link"
                onClick={insertLink}
                className={isLink ? "bg-subtle" : ""}
              />
              {isLink && createPortal(<FloatingLinkEditor editor={editor} />, document.body)}{" "}
            </>
          )}
        </>
        {props.variables && (
          <div className="ml-auto">
            <AddVariablesDropdown
              addVariable={addVariable}
              isTextEditor={true}
              variables={props.variables || []}
            />
          </div>
        )}
      </>
    </div>
  );
}
