"use client";

import Shell from "@calcom/features/shell/Shell";
import { Alert } from "@calcom/ui/components/alert";

export default function Error() {
  return (
    <Shell>
      <Alert severity="error" title="Something went wrong" />
    </Shell>
  );
}
