import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";

export default function AppSettings() {
  const { t } = useLocale();
  const [input, setInput] = useState("");

  return (
    <div className="space-y-4 px-4 pb-4 pt-4 text-sm">
      <TextField
        placeholder="Some Input"
        value={input}
        name="Enter Input"
        onChange={async (e) => {
          setInput(e.target.value);
        }}
      />
      <Button>{t("submit")}</Button>
    </div>
  );
}
