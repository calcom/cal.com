import { useSession } from "next-auth/react";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { trpc } from "@calcom/trpc";

export interface IUseVerifyGuestEmailsProps {
  guestEmails: string[];
}

export const useVerifyGuestEmails = ({ guestEmails }: IUseVerifyGuestEmailsProps) => {
  const debouncedGuestEmails = useDebounce(guestEmails, 600);
  const { data: session } = useSession();

  // Filter out empty strings before making the query
  const validGuestEmails = debouncedGuestEmails.filter((email) => email && email.trim() !== "");

  const { data: guestVerificationData } = trpc.viewer.public.checkIfGuestEmailsVerificationRequired.useQuery(
    {
      userSessionEmail: session?.user.email || "",
      emails: validGuestEmails,
    },
    {
      enabled: validGuestEmails.length > 0,
    }
  );

  return {
    guestsRequireVerification: guestVerificationData?.requiresVerification ?? false,
    guestsRequiringCount: guestVerificationData?.count ?? 0,
    emailsRequiringVerification: guestVerificationData?.emailsRequiringVerification ?? [],
  };
};
