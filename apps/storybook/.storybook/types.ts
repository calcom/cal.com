// Shared types for Storybook iframe communication

export type ElementData = {
  // React Component
  component: string | null;

  // Semantic props (filtered - no className, data-*, style, ref)
  props: Record<string, string> | null;

  // Source location (definition)
  source: {
    file: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null;

  // DOM element
  element: {
    tag: string;
    id?: string;
  };

  // Parent React component (for context)
  parentComponent: string | null;

  // CSS selector path (for deduplication)
  selectorPath: string;

  // Computed styles
  computedStyles: Record<string, string>;

  // Bounding rect
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Story context (added by parent when storing)
  story?: {
    nodeId: string;
    storyId: string;
    name: string;
    file?: string;
    theme: 'light' | 'dark';
  };
} | null;

// Message types for iframe-parent communication
export type IframeMessage =
  | { type: 'iframe-element-at-position'; element: ElementData }
  | { type: 'parent-mouse-position'; x: number; y: number }
  | { type: 'reload' };
