import { Tooltip, Button, Icon } from "@calid/features/ui";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export interface ExportBookingsButtonProps {
  handleOnClickExportBookings: () => Promise<void>;
  isLoading: boolean;
}

export default function ExportBookingsButton({
  handleOnClickExportBookings,
  isLoading,
}: ExportBookingsButtonProps) {
  const { t } = useLocale();
  return (
    <Button
      loading={isLoading}
      StartIcon="link-2"
      disabled={isLoading}
      color="secondary"
      onClick={() => handleOnClickExportBookings()}>
      <Icon name="circle-arrow-out-up-right" className="h-4 w-4" />
      <div>{t("export_bookings")}</div>
    </Button>
  );
}
