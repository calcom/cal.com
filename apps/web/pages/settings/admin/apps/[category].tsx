import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useRouter } from "next/router";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { TextField } from "@calcom/ui/components";
import { Switch } from "@calcom/ui/v2";
// import { List, ListItem, ListItemTitle, ListItemText } from "@calcom/ui/v2/core/List";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import { SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui/v2/core/skeleton";

function AdminAppsView() {
  const { t } = useLocale();
  const router = useRouter();
  const category = router.query.category;

  // const { data: integrations, isLoading } = trpc.useQuery(["viewer.integrations", { variant: category }], {
  //   onSuccess: (data) => {
  //     console.log("🚀 ~ file: [category].tsx ~ line 24 ~ AdminAppsView ~ data", data);
  //   },
  // });

  const { data: integrations, isLoading } = trpc.useQuery(["viewer.apps.listLocal", { variant: category }], {
    onSuccess: (data) => {
      console.log("🚀 ~ file: [category].tsx ~ line 28 ~ AdminAppsView ~ data", data);
    },
  });

  return (
    <>
      <Meta title="Apps" description="apps_description" />

      <AppCategoryNavigation baseURL="/settings/admin/apps">
        {isLoading ? (
          <SkeletonLoader />
        ) : (
          <div className="rounded-md border border-gray-200">
            {integrations.map((integration, index) => (
              <Collapsible key={integration.name}>
                <div className={`${index !== integrations.length - 1 && "border-b"}`}>
                  <div className="flex w-full flex-1 items-center justify-between space-x-3 p-4 rtl:space-x-reverse md:max-w-3xl">
                    {
                      // eslint-disable-next-line @next/next/no-img-element
                      integration.logo && (
                        <img className="h-10 w-10" src={integration.logo} alt={integration.title} />
                      )
                    }
                    <div className="flex-grow truncate pl-2">
                      <h3 className="truncate text-sm font-medium text-neutral-900">
                        <p>{integration.name || integration.title}</p>
                      </h3>
                      <p className="truncate text-sm text-gray-500">{integration.description}</p>
                    </div>
                    <div className="justify-self-end">
                      <CollapsibleTrigger>
                        <Switch />
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      {integration.keys?.map((key) => (
                        <TextField label={key} key={key} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </AppCategoryNavigation>
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export default AdminAppsView;

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mt-6 mb-8 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};
