function getAnchor(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/[ ]/g, "-")
    .replace(/ /g, "%20");
}

export default function Anchor({ as, children }) {
  const anchor = getAnchor(children);
  const link = `#${anchor}`;
  const Component = as || "div";
  return (
    <Component id={anchor}>
      <a href={link} className="anchor-link">
        §
      </a>
      {children}
    </Component>
  );
}
