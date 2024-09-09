import type { EditorConfig, LexicalNode, NodeKey, SerializedTextNode } from "lexical";
import { TextNode } from "lexical";
export declare class VariableNode extends TextNode {
    static getType(): string;
    static clone(node: VariableNode): VariableNode;
    constructor(text: string, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    exportJSON(): SerializedTextNode;
    isTextEntity(): true;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
}
export declare function $createVariableNode(text?: string): VariableNode;
export declare function $isVariableNode(node: LexicalNode | null | undefined): node is VariableNode;
//# sourceMappingURL=VariableNode.d.ts.map