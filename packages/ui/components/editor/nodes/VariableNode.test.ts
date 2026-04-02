import { createEditor, type LexicalEditor, TextNode } from "lexical";
import { beforeEach, describe, expect, it } from "vitest";
import { $createVariableNode, $isVariableNode, VariableNode } from "./VariableNode";

let editor: LexicalEditor;

beforeEach(() => {
  editor = createEditor({
    nodes: [VariableNode],
  });
});

describe("VariableNode", () => {
  it("should create a VariableNode with given text", () => {
    editor.update(() => {
      const node = $createVariableNode("test");
      expect(node.getTextContent()).toBe("test");
    });
  });

  it("should create a VariableNode with default text", () => {
    editor.update(() => {
      const node = $createVariableNode();
      expect(node.getTextContent()).toBe("");
    });
  });

  it("should clone a VariableNode", () => {
    editor.update(() => {
      const original = $createVariableNode("test");
      const clone = VariableNode.clone(original);
      expect(clone.getTextContent()).toBe("test");
      expect(clone.__key).not.toBe(original.__key);
    });
  });

  it("should create a DOM element with correct attributes", () => {
    editor.update(() => {
      const node = $createVariableNode("test");
      const dom = node.createDOM(editor._config);
      expect(dom.className).toBe("bg-cal-info");
      expect(dom.getAttribute("data-lexical-variable")).toBe("true");
    });
  });

  it("should export JSON correctly", () => {
    editor.update(() => {
      const node = $createVariableNode("test");
      const json = node.exportJSON();
      expect(json).toEqual({
        ...node.exportJSON(),
        type: "variable",
        version: 1,
      });
    });
  });

  it("should return true for isTextEntity", () => {
    editor.update(() => {
      const node = $createVariableNode("test");
      expect(node.isTextEntity()).toBe(true);
    });
  });

  it("should return false for canInsertTextBefore and canInsertTextAfter", () => {
    editor.update(() => {
      const node = $createVariableNode("test");
      expect(node.canInsertTextBefore()).toBe(false);
      expect(node.canInsertTextAfter()).toBe(false);
    });
  });

  it("should identify a VariableNode correctly", () => {
    editor.update(() => {
      const node = $createVariableNode("test");
      expect($isVariableNode(node)).toBe(true);
    });
  });

  it("should not identify a non-VariableNode", () => {
    editor.update(() => {
      const node = new TextNode("test");
      expect($isVariableNode(node)).toBe(false);
    });
  });
});
