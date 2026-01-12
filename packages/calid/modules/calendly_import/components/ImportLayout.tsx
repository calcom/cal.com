"use client";

import { Button } from "@calid/features/ui/components/button";
import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useCalendlyImport from "@calcom/web/lib/hooks/useCalendlyImport";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return <div />;
};

// Component responsible for importing data from Calendly if user has already authorized Calendly
const ImportFromCalendlyButton = ({
  importFromCalendly,
  importing,
}: {
  importFromCalendly: () => Promise<void>;
  importing: boolean;
}) => {
  const { t } = useLocale();
  return (
    <Button color="primary" StartIcon="download" onClick={importFromCalendly} loading={importing}>
      {t("import")}
    </Button>
  );
};

// Main view for Calendly import
const ImportLayout = () => {
  const [userId, setUserId] = useState<number>();
  const session = useSession();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || undefined;
  const redirected = searchParams.get("redirected") || undefined;

  // Checks if the user has already authorized Calendly on first load
  useEffect(() => {
    if (!session || !session.data) return;
    session.data.user.id && setUserId(session.data.user.id);
  }, [session]);

  return <>{userId ? <CalendlyImportComponent userId={userId} redirected={redirected} /> : <></>}</>;
};

const CalendlyImportComponent = ({ userId, redirected }: { userId: number; redirected?: string }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const { t } = useLocale();
  const router = useRouter();
  const hasImportedRef = useRef(false);

  const { importFromCalendly, importing, sendCampaignEmails, handleChangeNotifyUsers } =
    useCalendlyImport(userId);

  useEffect(() => {
    if (!isAuthorized) checkIfAuthorized(userId);
  }, [userId, isAuthorized]);

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
      if (redirected && data.authorized && !hasImportedRef.current) {
        hasImportedRef.current = true;
        await importFromCalendly();
        // Remove the query param after importing but stay on the same page
        router.replace(`/settings/others/import`);
      }
    } catch (e) {
      console.error("Authorization check failed:", e);
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

    const location = `${process.env.NEXT_PUBLIC_CALENDLY_OAUTH_URL}/authorize?${new URLSearchParams(
      queryParams
    )}`;
    window.location.href = location;
  };

  if (loading) {
    return <SkeletonLoader title={t("calendly_import")} description="" />;
  }

  return (
    <>
      <SettingsHeader
        title={t("import")}
        description={t("import_configuration", { appName: APP_NAME })}
        borderInShellHeader={false}>
        <div className="border-default flex flex-row items-center justify-between rounded-md border px-4 py-6 sm:px-6">
          <div>
            <div className="text-base font-medium">{t("calendly_import")}</div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={sendCampaignEmails}
                onCheckedChange={(checked) => handleChangeNotifyUsers(!!checked)}
              />
              <span className="text-sm">{t("notify_calendly_import")}</span>
            </div>
          </div>

          {isAuthorized ? (
            <div className="flex flex-col gap-2">
              <ImportFromCalendlyButton
                importFromCalendly={() => importFromCalendly()}
                importing={importing}
              />
            </div>
          ) : (
            <Button size="base" StartIcon="download" className="my-1" onClick={handleOnClickImport}>
              {t("connect_calendly")}
            </Button>
          )}
        </div>
      </SettingsHeader>
    </>
  );
};

export default ImportLayout;
