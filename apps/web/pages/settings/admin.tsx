import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { ComponentProps, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { TextField } from "@calcom/ui/form/fields";

import { QueryCell } from "@lib/QueryCell";
import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";

type Props = inferSSRProps<typeof getServerSideProps>;

function AdminView(props: ComponentProps<typeof Admin> & { localeProp: string }) {
  const utils = trpc.useContext();
  const { t } = useLocale();

  const usernameRef = useRef<HTMLInputElement>(null!);

  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="divide-y divide-gray-200 lg:col-span-9">
      {hasErrors && <Alert severity="error" title={errorMessage} />}
      <div className="py-6 lg:pb-8">
        <form
          className="mb-6 w-full sm:w-1/2"
          onSubmit={(e) => {
            e.preventDefault();
            const enteredUsername = usernameRef.current.value.toLowerCase();
            signIn("impersonation-auth", { username: enteredUsername }).then((res) => {
              console.log(res);
            });
          }}>
          <TextField
            name="Impersonate User"
            addOnLeading={
              <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                {process.env.NEXT_PUBLIC_WEBSITE_URL}/
              </span>
            }
            ref={usernameRef}
            defaultValue={undefined}
          />
          <p className="mt-2 text-sm text-gray-500" id="email-description">
            {t("impersonate_user_tip")}
          </p>
          <div className="flex justify-end py-4">
            <Button type="submit">{t("impersonate")}</Button>
          </div>
        </form>
      </div>
      <hr className="mt-8" />
    </div>
  );
}

export default function Admin(props: Props) {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.i18n"]);

  return (
    <Shell heading={t("profile")} subtitle={t("edit_profile_info_description")}>
      <SettingsShell>
        <QueryCell query={query} success={({ data }) => <AdminView {...props} localeProp={data.locale} />} />
      </SettingsShell>
    </Shell>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id || session.user.role != "ADMIN") {
    return { redirect: { permanent: false, destination: "/settings/profile" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
      hideBranding: true,
      theme: true,
      plan: true,
      brandColor: true,
      darkBrandColor: true,
      metadata: true,
      timeFormat: true,
      allowDynamicBooking: true,
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
    },
  };
};
