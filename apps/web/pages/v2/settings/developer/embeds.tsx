import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
import ApiKeyDialogForm from "@calcom/features/ee/api-keys/components/v2/ApiKeyDialogForm";
import ApiKeyListItem from "@calcom/features/ee/api-keys/components/v2/ApiKeyListItem";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import Button from "@calcom/ui/v2/core/Button";
import { Dialog, DialogContent } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

const EmbedsView = () => {
  return (
    <>
      <Meta title="embeds_title" description="embeds_description" />
    </>
  );
};

EmbedsView.getLayout = getLayout;

export default EmbedsView;
