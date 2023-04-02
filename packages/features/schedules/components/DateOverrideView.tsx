import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { FiPlus } from "@calcom/ui/components/icon";

import type { DateOverrideDialogProps } from "./DateOverrideDialog";
import DateOverrideDialog from "./DateOverrideDialog";

export const DateOverrideView = ({
  createDialogProps,
  list,
}: {
  list: React.ReactNode;
  createDialogProps: Omit<DateOverrideDialogProps, "Trigger">;
}) => {
  const { t } = useLocale();
  return (
    <>
      {list}
      <DateOverrideDialog
        {...createDialogProps}
        Trigger={
          <Button color="secondary" StartIcon={FiPlus} data-testid="add-override">
            {t("date_overrides_add_btn")}
          </Button>
        }
      />
    </>
  );
};

export default DateOverrideView;
