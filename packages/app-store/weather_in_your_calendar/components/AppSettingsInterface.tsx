import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";

export default function AppSettings() {
  const { t } = useLocale();
  const unit = "metric";
  const [location, setLocation] = useState("");

  return (
    <div className="stack-y-4 text-sm">
      <TextField
        placeholder="San Francisco"
        value={location}
        name="Enter City"
        onChange={async (e) => {
          setLocation(e.target.value);
        }}
      />
      <Button
        href={`webcal://weather-in-calendar.com/cal/weather-cal.php?city=${location}&units=${unit}&temperature=day`}>
        {t("add_to_calendar")}
      </Button>
    </div>
  );
}
