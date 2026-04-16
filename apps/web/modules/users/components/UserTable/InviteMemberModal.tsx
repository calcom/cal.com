import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import type { UserTableAction } from "./types";

interface Props {
  dispatch: Dispatch<UserTableAction>;
}

export function InviteMemberModal(props: Props) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { t, i18n } = useLocale();
  const inviteMemberMutation = {
    mutate: (..._args: unknown[]) => {},
    mutateAsync: async () => ({}),
    isPending: false,
  };

  const orgId = session?.user.org?.id;

  if (!orgId) return null;

  return null;
}
