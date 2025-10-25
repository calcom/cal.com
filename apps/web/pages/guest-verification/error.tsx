import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { Icon, IconSprites } from "@calcom/ui/components/icon";

type Props = {
  title: string;
  message: string;
};

export default function GuestVerificationError({ title, message }: Props) {
  return (
    <>
      <IconSprites />
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Icon name="x" className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { reason } = context.query;
  const session = await getServerSession(context);
  const locale = session?.user?.locale ?? "en";

  // Load translations
  const fs = await import("fs");
  const path = await import("path");
  const translationsPath = path.join(process.cwd(), "public", "static", "locales", locale, "common.json");
  const translations = JSON.parse(fs.readFileSync(translationsPath, "utf8"));

  const getErrorMessage = () => {
    switch (reason) {
      case "expired":
        return translations.guest_verification_link_expired;
      case "invalid":
        return translations.guest_verification_link_invalid;
      case "already_verified":
        return translations.guest_verification_already_verified;
      case "booking_cancelled":
        return translations.guest_verification_booking_cancelled;
      case "not_found":
        return translations.guest_verification_link_not_found;
      default:
        return translations.guest_verification_error_occurred;
    }
  };

  return {
    props: {
      title: translations.guest_verification_failed,
      message: getErrorMessage(),
    },
  };
};
