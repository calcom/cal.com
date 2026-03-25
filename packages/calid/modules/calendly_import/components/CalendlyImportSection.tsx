"use client";

import { Button } from "@calid/features/ui/components/button";
import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useCalendlyImport from "@calcom/web/lib/hooks/useCalendlyImport";

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

interface CalendlyImportSectionProps {
  userId: number;
  /** Path to redirect to after OAuth callback (e.g. /getting-started/user-settings) */
  redirectPath?: string;
}

export const CalendlyImportSection = ({ userId, redirectPath }: CalendlyImportSectionProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirected = searchParams.get("redirected") || undefined;
  const hasImportedRef = useRef(false);
  const hasCheckedRef = useRef(false);

  const { importFromCalendly, importing, sendCampaignEmails, handleChangeNotifyUsers } =
    useCalendlyImport(userId);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkIfAuthorized = async (uid: number) => {
      try {
        setLoading(true);
        if (!uid) return;
        const res = await fetch(`/api/import/calendly/auth?userId=${uid}`, {
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
          if (redirectPath) {
            router.replace(redirectPath);
          }
        }
      } catch (e) {
        console.error("Authorization check failed:", e);
      } finally {
        setLoading(false);
      }
    };

    checkIfAuthorized(userId);
  }, [userId, redirectPath, redirected, importFromCalendly, router]);

  const handleOnClickConnect = () => {
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
    return null;
  }

  return (
    <div className="border-subtle flex flex-col gap-3 rounded-md border px-4 py-4">
      <div className="text-base font-medium">{t("calendly_import")}</div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={sendCampaignEmails}
          onCheckedChange={(checked) => handleChangeNotifyUsers(!!checked)}
        />
        <span className="text-subtle text-sm">{t("notify_calendly_import")}</span>
      </div>

      {isAuthorized ? (
        <ImportFromCalendlyButton importFromCalendly={() => importFromCalendly()} importing={importing} />
      ) : (
        <Button size="sm" StartIcon="download" variant="outline" onClick={handleOnClickConnect}>
          {t("connect_calendly")}
        </Button>
      )}
    </div>
  );
};
