import type { ReactNode } from "react";

export function UpgradeTip({
  children,
}: {
  title?: string;
  description?: string;
  background?: string;
  features?: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  children: ReactNode;
  isParentLoading?: ReactNode;
  plan?: "team" | "enterprise";
}) {
  // In the open-source distribution there is no paywall – always render children.
  return <>{children}</>;
}
