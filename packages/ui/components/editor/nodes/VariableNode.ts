import type { EditorConfig, LexicalNode, NodeKey, SerializedTextNode } from "lexical";
import { $applyNodeReplacement, TextNode } from "lexical";

export class VariableNode extends TextNode {
  static getType(): string {
    return "variable";
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = "bg-cal-info";
    dom.setAttribute("data-lexical-variable", "true");
    return dom;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "variable",
      version: 1,
    };
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createVariableNode(text = ""): VariableNode {
  const node = new VariableNode(text);
  node.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(node);
}

export function $isVariableNode(node: LexicalNode | null | undefined): node is VariableNode {
  return node instanceof VariableNode;
}
