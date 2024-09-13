// Extra styles to show prefixed text in react-select
export const getPlaceholderContent = (hidePlaceholder = false, contentText = "Create events on") => {
  if (!hidePlaceholder) {
    return {
      alignItems: "center",
      width: "100%",
      display: "flex",
      ":before": {
        content: contentText,
        display: "block",
        marginRight: 8,
      },
    };
  }
  return {};
};
