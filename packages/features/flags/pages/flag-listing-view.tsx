"use client";

import type { FlagAdminListProps } from "../components/FlagAdminList";
import { FlagAdminList } from "../components/FlagAdminList";

export const FlagListingView = (props: FlagAdminListProps) => {
  return <FlagAdminList {...props} />;
};
