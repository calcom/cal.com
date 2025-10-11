import TurndownService from "turndown";

const turndownService = new TurndownService();

function turndown(html: string | TurndownService.Node): string {
  let result = turndownService.turndown(html);
  result = result.replaceAll("[<p><br></p>]", "");

  if (result === "<p><br></p>") {
    result = "";
  }

  return result;
}

turndownService.addRule("shiftEnter", {
  filter: function (node) {
    return node.nodeName === "BR" && !!isShiftEnter(node);
  },
  replacement: function () {
    return "<br>";
  },
});

turndownService.addRule("enter", {
  filter: function (node) {
    return node.nodeName === "BR" && !isShiftEnter(node);
  },
  replacement: function () {
    return "<p><br></p>";
  },
});

turndownService.addRule("ignoreEmphasized", {
  filter: "em",
  replacement: function (content) {
    return content;
  },
});

function isShiftEnter(node: Node | null | undefined): boolean {
  if (!node) return false;

  // Walk up to the nearest element node
  let currentNode: Node | null = node;
  while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
    currentNode = currentNode.parentNode;
  }

  if (!currentNode || currentNode.nodeType !== Node.ELEMENT_NODE) return false;

  const parent = currentNode.parentNode;
  // Ensure parent is an element-like node and has childNodes
  if (!parent || typeof parent.childNodes === "undefined") return false;

  // normal enter is <p><br><p> (p has exactly one childNode)
  return parent.childNodes.length !== 1;
}

export default turndown;
