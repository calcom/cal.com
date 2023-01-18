export const getNodeText = (node: string | JSX.Element | JSX.Element[]): string => {
  if (typeof node === "string") return node;
  if (node instanceof Array) return node.map(getNodeText).join("");
  if (typeof node === "object" && node) return getNodeText(node.props.children);
  return "";
};
