import { Button } from "@calid/features/ui/components/button";
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
      StartIcon="download"
      disabled={isLoading}
      color="secondary"
      onClick={() => handleOnClickExportBookings()}>
      <div>{t("export_bookings")}</div>
    </Button>
  );
}
