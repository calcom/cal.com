import { Text } from "ink";
import type React from "react";

export function ImportantText({ children }: { children: React.ReactNode }) {
  return <Text color="red">{children}</Text>;
}
