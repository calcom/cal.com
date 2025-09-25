import { useEffect, useState } from "react";

import { showToast } from "@calcom/ui/components/toast";

const useCalendlyImport = (userId: number) => {
  const [importing, setImporting] = useState(false);

  const [sendCampaignEmails, setSendCampaignEmails] = useState<boolean>(
    Boolean(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("notifyBookers="))
        ?.split("=")[1] === "true"
    )
  );

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

      console.log("Response: ", response);

      if (response.ok) {
        showToast("Data will import within 24 hours!", "success");
      } else {
        console.error("Error importing from Calendly");
        showToast("Failed to import data from Calendly", "error");
      }
    } catch (error) {
      console.error("Error importing from Calendly", error);
      showToast("Failed to import data from Calendly", "error");
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
