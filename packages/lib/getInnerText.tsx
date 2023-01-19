export const getInnerText = (node: string | JSX.Element | JSX.Element[]): string => {
  if (typeof node === "string") return node;
  if (node instanceof Array) return node.map(getInnerText).join("");
  if (typeof node === "object" && node) return getInnerText(node.props.children);
  return "";
};
