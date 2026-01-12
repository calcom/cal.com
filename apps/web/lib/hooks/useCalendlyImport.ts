"use client";

import { triggerToast } from "@calid/features/ui/components/toast";
import { useEffect, useState } from "react";

const useCalendlyImport = (userId: number) => {
  const [importing, setImporting] = useState(false);

  const [sendCampaignEmails, setSendCampaignEmails] = useState<boolean>(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("notifyBookers="))
      ?.split("=")[1];

    if (cookieValue === undefined) {
      document.cookie = `notifyBookers=true; expires=${new Date(Date.now() + 864e5).toUTCString()}; path=/`;
      setSendCampaignEmails(true);
    } else {
      setSendCampaignEmails(cookieValue === "true");
    }
  }, []);

  useEffect(() => {
    // if cookie does not exist, then set cookie and set doNotify to true
    if (!document.cookie.includes("notifyBookers")) {
      document.cookie = `notifyBookers=true; expires=${new Date(Date.now() + 864e5).toUTCString()}; path=/`;
      setSendCampaignEmails(true);
    }
  }, []);

  const handleChangeNotifyUsers = (state: boolean) => {
    setSendCampaignEmails(state);
    document.cookie = `notifyBookers=${state}; expires=${new Date(Date.now() + 864e5).toUTCString()}; path=/`;
  };

  const importFromCalendly = async () => {
    if (importing) return;

    setImporting(true);

    const uri = `/api/import/calendly?userId=${userId}&sendCampaignEmails=${sendCampaignEmails}`;

    try {
      const response = await fetch(uri, {
        headers: {
          "Content-Type": "application/json",
        },
        method: "GET",
      });

      if (response.ok) {
        triggerToast("Data will import within 24 hours!", "success");
      } else {
        console.error("Error importing from Calendly");
        triggerToast("Failed to import data from Calendly", "error");
      }
    } catch (error) {
      console.error("Error importing from Calendly", error);
      triggerToast("Failed to import data from Calendly", "error");
    } finally {
      setImporting(false);
    }
  };

  return {
    importFromCalendly,
    importing,
    setSendCampaignEmails,
    sendCampaignEmails,
    handleChangeNotifyUsers,
  };
};

export default useCalendlyImport;
