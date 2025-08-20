"use client";

import { Checkbox, Button } from "@calid/features/ui";
// import { Meta, SkeletonContainer } from "@calcom/ui/components";
import { _generateMetadata, getTranslate } from "app/_utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import useCalendlyImport from "@lib/hooks/useCalendlyImport";

// export const generateMetadata = async () =>
//   await _generateMetadata(
//     (t) => t("import"),
//     (t) => t("import_configuration"),
//     undefined,
//     undefined,
//     "/settings/others/import"
//   );
// const ImportView = () => {
//   const [userId, setUserId] = useState<number>();
//   const session = useSession();
//   // Checks if the user has already authorized Calendly on first load
//   useEffect(() => {
//     if (!session || !session.data) return;
//     session.data.user.id && setUserId(session.data.user.id);
//   }, [session]);
//   const { importFromCalendly, importing, handleChangeNotifyUsers, sendCampaignEmails } =
//     useCalendlyImport(userId);
//   const { t } = useLocale();
//   return (
//   );
// };

// export const generateMetadata = async () =>
//   await _generateMetadata(
//     (t) => t("import"),
//     (t) => t("import_configuration"),
//     undefined,
//     undefined,
//     "/settings/others/import"
//   );

// const ImportView = () => {
//   const [userId, setUserId] = useState<number>();

//   const session = useSession();

//   // Checks if the user has already authorized Calendly on first load
//   useEffect(() => {
//     if (!session || !session.data) return;
//     session.data.user.id && setUserId(session.data.user.id);
//   }, [session]);

//   const { importFromCalendly, importing, handleChangeNotifyUsers, sendCampaignEmails } =
//     useCalendlyImport(userId);
//   const { t } = useLocale();
//   return (
//   );
// };

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div></div>
    // <SkeletonContainer>
    //   <Meta title={title} description={description} borderInShellHeader={true} />
    // </SkeletonContainer>
  );
};

// Component responsible for importing data from Calendly if user has already authorized Calendly
const ImportFromCalendlyButton = ({
  importFromCalendly,
  importing,
}: {
  importFromCalendly: () => Promise<void>;
  importing: boolean | undefined;
}) => {
  const { t } = useLocale();

  return (
    <Button color="secondary" StartIcon="plus" onClick={importFromCalendly} loading={importing}>
      {t("import")}
    </Button>
  );
};

// Main view for Calendly import
const ImportLayout = ({ code }: { code?: string }) => {
  const [userId, setUserId] = useState<number>();

  const session = useSession();

  // Checks if the user has already authorized Calendly on first load
  useEffect(() => {
    if (!session || !session.data) return;
    session.data.user.id && setUserId(session.data.user.id);
  }, [session]);

  return <> {userId ? <CalendlyImportComponent userId={userId} code={code} /> : <></>}</>;
};

const CalendlyImportComponent = ({ userId, code }: { userId: number; code?: string }) => {
  const { importFromCalendly, importing, handleChangeNotifyUsers, sendCampaignEmails } =
    useCalendlyImport(userId);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const { t } = useLocale();

  const router = useRouter();

  useEffect(() => {
    if (code) importFromCalendly(); // .then(() => router.replace("/event-types"));
    else checkIfAuthorized(userId);
  }, [userId, code]);

  // Checks if the user has already authorized Calendly
  const checkIfAuthorized = async (userId: number) => {
    try {
      setLoading(true);
      if (!userId) return;
      const res = await fetch(`/api/import/calendly/auth?userId=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("error", data);
        return;
      }
      const data = await res.json();
      setIsAuthorized(data.authorized);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleOnClickImport = () => {
    const queryParams = {
      client_id: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_CALENDLY_REDIRECT_URI ?? "",
      response_type: "code",
    };
    window.location.href = `${process.env.NEXT_PUBLIC_CALENDLY_OAUTH_URL}/authorize?${new URLSearchParams(
      queryParams
    )}`;
  };

  return (
    <>
      {/* <SettingsHeader
      title={t("import")}
      description={t("import_configuration", { appName: APP_NAME })}
      borderInShellHeader={false}> */}
      <div className="border-subtle my-6 flex flex-row items-center justify-between rounded-md border p-6">
        <div>
          <div className="text-base font-medium">{t("calendly_import")}</div>
        </div>
        <Button size="base" StartIcon="download" className="my-1">
          {t("import")}
        </Button>
      </div>
      {/* </SettingsHeader> */}

      {loading ? (
        <SkeletonLoader title="Calendly" description={t("import_data_instructions")} />
      ) : (
        <div className="bg-default w-full sm:mx-0 xl:mt-0">
          <SettingsHeader
            title="Calendly"
            description={t("import_data_instructions")}
            CTA={
              isAuthorized ? (
                <ImportFromCalendlyButton
                  importFromCalendly={
                    () => importFromCalendly()
                    // .then(() => router.replace("/event-types"))
                  }
                  importing={importing}
                />
              ) : (
                <Button onClick={handleOnClickImport} color="secondary" StartIcon="plus">
                  {t("import")}
                </Button>
              )
            }
            borderInShellHeader={true}
          />
          <div className="mt-3 px-4">
            <div className="mt-2 flex w-full flex-row items-center gap-2">
              <Checkbox className="h-4 w-4" />
              <div className="text-emphasis text-xs">{t("notify_calendly_import")}</div>
            </div>
            {/* <CheckboxField
              checked={sendCampaignEmails}
              description={t("notify_past_bookers")}
              onChange={(e) => {
                handleChangeNotifyUsers(e.target.checked);
              }}
            /> */}
          </div>
        </div>
      )}
    </>
  );
};

export default ImportLayout;
