import Shell from "@calcom/features/shell/Shell";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { EmptyScreen } from "@calcom/ui";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import type { RoutingFormWithResponseCount } from "../../components/SingleForm";
import { enabledIncompleteBookingApps } from "../../lib/enabledIncompleteBookingApps";

function Page({ form }: { form: RoutingFormWithResponseCount }) {
  const { data, isLoading } = trpc.viewer.appRoutingForms.getIncompleteBookingSettings.useQuery({
    formId: form.id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check to see if the user has any compatable credentials
  if (
    !data?.credentials.some((credential) => enabledIncompleteBookingApps.includes(credential?.appId ?? ""))
  ) {
    return <div>No apps installed that support this feature</div>;
  }

  if (data?.incompleteBookingActions.length === 0) {
    return (
      <EmptyScreen
        Icon="file-text"
        headline="Create new action"
        description="Create a new action when the form is filled but a booking was created"
      />
    );
  }
}

export default function IncompleteBookingPage({
  form,
  appUrl,
  enrichedWithUserProfileForm,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      enrichedWithUserProfileForm={enrichedWithUserProfileForm}
      Page={Page}
    />
  );
}

IncompleteBookingPage.getLayout = (page: React.ReactElement) => {
  return (
    <Shell backPath="/apps/routing-forms/forms" withoutMain={true}>
      {page}
    </Shell>
  );
};

export { getServerSideProps };
