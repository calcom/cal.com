"use client";

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
  $setSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "../../button";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../dropdown";
import { Icon } from "../../icon";
import type { TextEditorProps } from "../types";
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

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function FloatingLinkEditor({
  editor,
  selectionRef,
}: {
  editor: LexicalEditor;
  selectionRef: React.MutableRefObject<RangeSelection | NodeSelection | GridSelection | null>;
}) {
  const editorRef = useRef<HTMLInputElement>(null);
  const mouseDownRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastSelectionRef = useRef<RangeSelection | NodeSelection | GridSelection | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [isEditMode, setEditMode] = useState(true);
  const [lastSelection, setLastSelection] = useState<RangeSelection | NodeSelection | GridSelection | null>(
    null
  );

  const commitLink = useCallback(
    (rawUrl: string) => {
      const selection = lastSelectionRef.current || selectionRef.current;
      if (selection === null) return;
      const selectionToRestore =
        "clone" in selection && typeof selection.clone === "function" ? selection.clone() : selection;
      const normalizedUrl = normalizeUrl(rawUrl);
      const shouldRemove = normalizedUrl === "" || normalizedUrl === "https://";
      editor.update(() => {
        $setSelection(selectionToRestore);
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, shouldRemove ? null : normalizedUrl);
      });
      setEditMode(false);
    },
    [editor]
  );

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        if (!isEditMode) setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        if (!isEditMode) setLinkUrl(node.getURL());
      } else {
        if (!isEditMode) setLinkUrl("");
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

      const selectionSnapshot = selection.clone();
      setLastSelection(selectionSnapshot);
      lastSelectionRef.current = selectionSnapshot;
      selectionRef.current = selectionSnapshot;
    } else if (
      !activeElement ||
      (activeElement.className !== "link-input" && !editorElem.contains(activeElement))
    ) {
      if (!isEditMode) {
        positionEditorElement(editorElem, null);
        setLastSelection(null);
        lastSelectionRef.current = null;
        setEditMode(false);
        setLinkUrl("");
      }
    }

    return true;
  }, [editor, isEditMode, selectionRef]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const editorElem = editorRef.current;
      const target = event.target as Node;

      // Close if clicking outside the link editor
      if (editorElem && !editorElem.contains(target)) {
        // Check if click is inside the lexical editor root
        const rootElement = editor.getRootElement();
        const isClickInEditor = rootElement && rootElement.contains(target);

        if (!isClickInEditor) {
          if (isEditMode) {
            commitLink(linkUrl);
          }
          // Clicked outside both link editor and lexical editor - close it
          positionEditorElement(editorElem, null);
          setLastSelection(null);
          lastSelectionRef.current = null;
          setEditMode(false);
          setLinkUrl("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editor, commitLink, isEditMode, linkUrl]);

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
          placeholder="https://"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value);
          }}
          onBlur={() => {
            if (isEditMode) commitLink(linkUrl);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (lastSelection !== null) {
                commitLink(linkUrl);
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
  const linkSelectionRef = useRef<RangeSelection | NodeSelection | GridSelection | null>(null);
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

        const root = $getRoot();
        root.clear(); // Clear existing content first
        root.select();
        try {
          $insertNodes(nodes);
        } catch (e: unknown) {
          // resolves: "topLevelElement is root node at RangeSelection.insertNodes"
          // @see https://stackoverflow.com/questions/73094258/setting-editor-from-html
          const paragraphNode = $createParagraphNode();
          nodes.forEach((n) => paragraphNode.append(n));
          root.append(paragraphNode);
        }

        editor.registerUpdateListener(({ editorState, prevEditorState }) => {
          editorState.read(() => {
            const textInHtml = $generateHtmlFromNodes(editor).replace(/</g, "<").replace(/>/g, ">");
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
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          linkSelectionRef.current = selection.clone();
        }
      });
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  if (!props.editable) return null;
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
              aria-label="Bold"
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
              aria-label="Italic"
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
                aria-label="Link"
                color="minimal"
                variant="icon"
                type="button"
                StartIcon="link"
                onClick={insertLink}
                className={isLink ? "bg-subtle" : ""}
              />
              {isLink &&
                createPortal(
                  <FloatingLinkEditor editor={editor} selectionRef={linkSelectionRef} />,
                  document.body
                )}{" "}
            </>
          )}
        </>
        {props.variables && (
          <div className={`${props.addVariableButtonTop ? "-mt-10" : ""} ml-auto`}>
            <AddVariablesDropdown
              addVariable={addVariable}
              isTextEditor={true}
              variables={props.variables || []}
              addVariableButtonTop={props.addVariableButtonTop}
            />
          </div>
        )}
      </>
    </div>
  );
}
