import type { AppFlags } from "@calcom/features/flags/config";
import { trpc } from "@calcom/trpc/react";

const initialData: AppFlags = {
  organizations: false,
  teams: false,
  "calendar-cache": false,
  emails: false,
  insights: false,
  webhooks: false,
  workflows: false,
  "email-verification": false,
  "google-workspace-directory": false,
  "disable-signup": false,
};

if (process.env.NEXT_PUBLIC_IS_E2E) {
  initialData.organizations = true;
  initialData.teams = true;
}

export function useFlags(): Partial<AppFlags> {
  const query = trpc.viewer.features.map.useQuery(undefined, {
    initialData,
  });
  return query.data ?? {};
}
