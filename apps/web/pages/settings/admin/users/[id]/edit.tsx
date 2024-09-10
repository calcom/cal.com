import { z } from "zod";

import NoSSR from "@calcom/core/components/NoSSR";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import UsersEditView from "@calcom/features/ee/users/pages/users-edit-view";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const userIdSchema = z.object({ id: z.coerce.number() });

const Page = () => {
  const params = useParamsWithFallback();
  const input = userIdSchema.safeParse(params);

  if (!input.success) return <div>Invalid input</div>;

  const [data] = trpc.viewer.users.get.useSuspenseQuery({ userId: input.data.id });
  const { user } = data;

  return (
    <>
      <Meta title={`Editing user: ${user.username}`} description="Here you can edit a current user." />
      <div>
        <LicenseRequired>
          <NoSSR>
            <UsersEditView user={user} />
          </NoSSR>
        </LicenseRequired>
      </div>
    </>
  );
};

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
