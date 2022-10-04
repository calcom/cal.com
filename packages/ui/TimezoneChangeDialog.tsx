import { useState } from "react";

import { DialogContent } from "@calcom/ui/v2";
import { Dialog } from "@calcom/ui/v2/core/Dialog";
import Checkbox from "@calcom/ui/v2/core/form/Checkbox";

export default function TimezoneChangeDialog() {
  // todo: save "close" result as cookie (to not show it again)
  const [open, setOpen] = useState(true);

  function updateTimezone() {
    // todo: update timezone in db
    setOpen(false);
  }

  // todo: detect timezone
  const timezone = "America/Los_Angeles";

  // todo: i18n
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title="Update Timezone?"
        description={`It seems like you changed your timezone to ${timezone.replace(
          "_",
          " "
        )}. Do you want to update it?`}
        type="creation"
        actionText="Update timezone"
        actionOnClick={() => updateTimezone()}
        closeText="Don't update">
        <Checkbox description="Always update timezone" />
      </DialogContent>
    </Dialog>
  );
}
