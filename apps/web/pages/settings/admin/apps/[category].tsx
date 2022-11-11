import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { TextField, Button, Form } from "@calcom/ui/components";
import { Switch, showToast } from "@calcom/ui/v2";
// import { List, ListItem, ListItemTitle, ListItemText } from "@calcom/ui/v2/core/List";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import { SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui/v2/core/skeleton";

const IntegrationContainer = ({ app, lastEntry }) => {
  const utils = trpc.useContext();

  const formMethods = useForm();

  const enableAppMutation = trpc.useMutation(["viewer.apps.toggle"], {
    onSuccess: (enabled) => {
      utils.invalidateQueries(["viewer.apps.listLocal"]);
      // TODO add translations, two strings
      showToast(`${app.name} is ${enabled ? "enabled" : "disabled"}`, "success");
    },
  });

  const saveKeysMutation = trpc.useMutation(["viewer.apps.saveKeys"], {
    onSuccess: () => {
      // TODO add translations
      showToast(`Keys have been saved`, "success");
    },
  });

  return (
    <Collapsible key={app.name} open={app.enabled}>
      <div className={`${!lastEntry && "border-b"}`}>
        <div className="flex w-full flex-1 items-center justify-between space-x-3 p-4 rtl:space-x-reverse md:max-w-3xl">
          {
            // eslint-disable-next-line @next/next/no-img-element
            app.logo && <img className="h-10 w-10" src={app.logo} alt={app.title} />
          }
          <div className="flex-grow truncate pl-2">
            <h3 className="truncate text-sm font-medium text-neutral-900">
              <p>{app.name || app.title}</p>
            </h3>
            <p className="truncate text-sm text-gray-500">{app.description}</p>
          </div>
          <div className="justify-self-end">
            <CollapsibleTrigger>
              <Switch
                checked={app.enabled}
                onClick={() => enableAppMutation.mutate({ slug: app.slug, enabled: app.enabled })}
              />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          {app.keys && (
            <Form
              form={formMethods}
              handleSubmit={(values) =>
                saveKeysMutation.mutate({ slug: app.slug, type: app.type, keys: values })
              }
              className="px-4 pb-4">
              {Object.keys(app.keys)?.map((key) => (
                <Controller
                  name={key}
                  key={key}
                  control={formMethods.control}
                  defaultValue={app.keys[key]}
                  render={({ field: { value } }) => (
                    <TextField
                      label={key}
                      key={key}
                      name={key}
                      value={value}
                      onChange={(e) => {
                        formMethods.setValue(key, e?.target.value);
                      }}
                    />
                  )}
                />
              ))}
              <Button type="submit">Save</Button>
            </Form>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

function AdminAppsView() {
  const { t } = useLocale();
  const router = useRouter();
  const category = router.query.category;

  const { data: apps, isLoading } = trpc.useQuery(["viewer.apps.listLocal", { variant: category }], {
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
            {apps.map((app, index) => (
              <IntegrationContainer app={app} lastEntry={index === apps.length - 1} key={app.name} />
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
