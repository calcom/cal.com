import Shell from "@calcom/features/shell/Shell";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import type { RoutingFormWithResponseCount } from "../../components/SingleForm";

function Page({ form }: { form: RoutingFormWithResponseCount }) {
  const { data, isLoading } = trpc.viewer.appRoutingForms.getIncompleteBookingSettings.useQuery({
    formId: form.id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return <h1>Incomplete Booking</h1>;
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
