import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
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
