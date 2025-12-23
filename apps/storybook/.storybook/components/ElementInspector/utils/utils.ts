import type { ElementData } from '../../../types';

type Fiber = {
  type?:
    | string
    | { name?: string; displayName?: string }
    | ((...args: unknown[]) => unknown);
  return?: Fiber;
};

// Props to filter out (noise, not semantic)
const FILTERED_PROPS = new Set([
  'className',
  'class',
  'style',
  'ref',
  'children',
  'key',
  'dangerouslySetInnerHTML',
]);

// Max length for string props before filtering
const MAX_PROP_LENGTH = 50;

// Get React props from DOM element via __reactProps$xxx
export function getReactProps(element: HTMLElement): Record<string, unknown> | null {
  const key = Object.keys(element).find((k) => k.startsWith('__reactProps$'));
  return key
    ? ((element as unknown as Record<string, Record<string, unknown>>)[key] ?? null)
    : null;
}

// Get React fiber from DOM element via __reactFiber$xxx
export function getReactFiber(element: HTMLElement): Fiber | null {
  const key = Object.keys(element).find((k) => k.startsWith('__reactFiber$'));
  return key ? ((element as unknown as Record<string, Fiber>)[key] ?? null) : null;
}

// Extended fiber type with memoizedProps
type FiberWithProps = Fiber & {
  memoizedProps?: Record<string, unknown>;
};

// Get component name from fiber
function getComponentNameFromFiber(fiber: Fiber | null): string | null {
  if (!fiber) return null;
  const type = fiber.type;
  if (typeof type === 'function' && 'name' in type && type.name) {
    return type.name;
  }
  if (typeof type === 'object' && type !== null) {
    if ('displayName' in type && type.displayName) {
      return type.displayName;
    }
    if ('name' in type && type.name) {
      return type.name;
    }
  }
  return null;
}

// Get component props from fiber tree (finds first named component's props)
function getComponentPropsFromFiber(
  element: HTMLElement,
): Record<string, unknown> | null {
  let fiber: FiberWithProps | null | undefined = getReactFiber(element) as FiberWithProps;
  while (fiber) {
    const name = getComponentNameFromFiber(fiber);
    if (name && fiber.memoizedProps) {
      return fiber.memoizedProps;
    }
    fiber = fiber.return as FiberWithProps | undefined;
  }
  return null;
}

// Walk up fiber tree to find component name
export function getComponentName(element: HTMLElement): string | null {
  let fiber: Fiber | null | undefined = getReactFiber(element);
  while (fiber) {
    const name = getComponentNameFromFiber(fiber);
    if (name) return name;
    fiber = fiber.return;
  }
  return null;
}

// Walk up fiber tree to find parent component name (skip the first one)
export function getParentComponentName(element: HTMLElement): string | null {
  let fiber: Fiber | null | undefined = getReactFiber(element);
  let foundFirst = false;

  while (fiber) {
    const name = getComponentNameFromFiber(fiber);
    if (name) {
      if (foundFirst) {
        return name;
      }
      foundFirst = true;
    }
    fiber = fiber.return;
  }
  return null;
}

// Check if prop should be filtered
function shouldFilterProp(key: string, value: unknown): boolean {
  // Skip internal props
  if (key.startsWith('__')) return true;

  // Skip data-* attributes
  if (key.startsWith('data-')) return true;

  // Skip known noise props
  if (FILTERED_PROPS.has(key)) return true;

  // Skip long strings (likely className or similar)
  if (typeof value === 'string' && value.length > MAX_PROP_LENGTH) return true;

  return false;
}

// Serialize props with filtering and placeholders
export function serializeProps(
  props: Record<string, unknown>,
): Record<string, string> | null {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(props)) {
    if (shouldFilterProp(key, value)) continue;
    if (value === undefined) continue;

    if (typeof value === 'function') {
      result[key] = '[Function]';
    } else if (value instanceof HTMLElement) {
      result[key] = '[Element]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = '[Object]';
    } else if (typeof value === 'boolean') {
      result[key] = value ? 'true' : 'false';
    } else {
      result[key] = String(value);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

// Get key computed styles
export function getStyles(element: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(element);
  return {
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontFamily: computed.fontFamily,
    display: computed.display,
    position: computed.position,
  };
}

// Generate CSS selector path from element to root (for deduplication)
export function generateSelectorPath(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Stop at ID (unique identifier)
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    // Add nth-child for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Parse source location from data attributes
function parseSource(
  element: HTMLElement | null,
): ElementData extends null ? never : NonNullable<ElementData>['source'] {
  if (!element) return null;

  const file = element.getAttribute('data-component-file');
  const start = element.getAttribute('data-component-start');
  const end = element.getAttribute('data-component-end');

  if (!file || !start || !end) return null;

  // Parse "52:4" format
  const [startLine, startColumn] = start.split(':').map(Number);
  const [endLine, endColumn] = end.split(':').map(Number);

  return {
    file,
    startLine,
    startColumn,
    endLine,
    endColumn,
  };
}

// Extract all element data in one call
export function extractElementData(target: HTMLElement): NonNullable<ElementData> {
  const componentElement = target.closest('[data-component-file]') as HTMLElement | null;
  const elementToInspect = componentElement || target;

  // Get component props from fiber tree (memoizedProps on the component fiber)
  const componentProps = getComponentPropsFromFiber(elementToInspect);
  const rect = elementToInspect.getBoundingClientRect();

  return {
    // React Component
    component: getComponentName(elementToInspect),

    // Filtered semantic props from component's memoizedProps
    props: componentProps ? serializeProps(componentProps) : null,

    // Source location
    source: parseSource(componentElement),

    // DOM element
    element: {
      tag: elementToInspect.tagName.toLowerCase(),
      id: elementToInspect.id || undefined,
    },

    // Parent component for context
    parentComponent: getParentComponentName(elementToInspect),

    // Selector path for deduplication
    selectorPath: generateSelectorPath(elementToInspect),

    // Computed styles
    computedStyles: getStyles(elementToInspect),

    // Bounding rect
    rect: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    },
  };
}
