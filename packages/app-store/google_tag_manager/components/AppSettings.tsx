import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, TextField } from "@calcom/ui";

export default function AppSettings() {
  const { t } = useLocale();
  const [gtmContainerId, setGtmContainerId] = useState("");

  return (
    <div className="space-y-4 px-4 pt-4 pb-4 text-sm">
      <TextField
        placeholder="GTM-xxxxxxx"
        value={gtmContainerId}
        name="Enter GTM Container ID"
        onChange={async (e) => {
          setGtmContainerId(e.target.value);
        }}
      />
      <Button>{t("save")}</Button>
    </div>
  );
}
