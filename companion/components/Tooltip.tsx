interface TooltipProps {
  text: string;
  children: React.ReactElement;
}

export function Tooltip({ text, children }: TooltipProps) {
  // Native Tooltip is a no-op; web implementation lives in Tooltip.web.tsx
  void text;
  return children;
}
