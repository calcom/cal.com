import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";

type PartialLoadingBannerProps = {
  totalHosts: number;
  loadedHosts: number;
  onLoadMore: () => void;
  isLoading?: boolean;
};

export const PartialLoadingBanner = ({
  totalHosts,
  loadedHosts,
  onLoadMore,
  isLoading,
}: PartialLoadingBannerProps) => {
  const { t } = useLocale();

  return (
    <Alert
      severity="info"
      className="mb-3"
      title={t("partial_availability_loaded", { loaded: loadedHosts, total: totalHosts })}
      message={t("partial_availability_message")}
      actions={
        <Button
          color="secondary"
          size="sm"
          onClick={onLoadMore}
          loading={isLoading}
          disabled={isLoading}>
          {t("load_more_availability")}
        </Button>
      }
    />
  );
};
