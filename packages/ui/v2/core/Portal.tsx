import React, { Fragment, ReactNode } from "react";
import ReactDOM from "react-dom";

export const Portal = (props: { children: React.ReactNode }) => {
  const portalContainer = document.getElementById("Portal");

  // This should never be the case as it lives in _document.tsx
  if (!portalContainer) return null;

  return ReactDOM.createPortal(<Fragment>{props.children}</Fragment>, portalContainer);
};
