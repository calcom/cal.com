import { zodResolver } from "@hookform/resolvers/zod";
import { AppCategories } from "@prisma/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import {
  Button,
  ConfirmationDialogContent,
  Dialog,
  EmptyScreen,
  Form,
  List,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  Switch,
  TextField,
  VerticalDivider,
} from "@calcom/ui";
import { FiAlertCircle, FiEdit } from "@calcom/ui/components/icon";

import AppListCard from "../../../apps/web/components/AppListCard";

const IntegrationContainer = ({
  app,
  category,
}: {
  app: RouterOutputs["viewer"]["appsRouter"]["listLocal"][number];
  category: string;
}) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [disableDialog, setDisableDialog] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const appKeySchema = appKeysSchemas[app.dirName as keyof typeof appKeysSchemas];

  const formMethods = useForm({
    resolver: zodResolver(appKeySchema),
  });

  const enableAppMutation = trpc.viewer.appsRouter.toggle.useMutation({
    onSuccess: (enabled) => {
      utils.viewer.appsRouter.listLocal.invalidate({ category });
      setDisableDialog(false);
      showToast(
        enabled ? t("app_is_enabled", { appName: app.name }) : t("app_is_disabled", { appName: app.name }),
        "success"
      );
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const saveKeysMutation = trpc.viewer.appsRouter.saveKeys.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <li>
      <Collapsible open={showKeys}>
        <AppListCard
          logo={app.logo}
          description={app.description}
          title={app.name}
          isTemplate={app.isTemplate}
          isDefault={app.isGlobal}
          actions={
            <div className="flex justify-self-end">
              {!app.isGlobal && (
                <Switch
                  checked={app.enabled}
                  onClick={() => {
                    if (app.enabled) {
                      setDisableDialog(true);
                    } else {
                      enableAppMutation.mutate({ slug: app.slug, enabled: app.enabled });
                      setShowKeys(true);
                    }
                  }}
                />
              )}
              {app.keys && !app.isGlobal && <VerticalDivider className="h-10" />}
              {app.keys && (
                <CollapsibleTrigger>
                  <Button
                    color="secondary"
                    variant="icon"
                    tooltip={t("edit_keys")}
                    onClick={() => setShowKeys(!showKeys)}>
                    <FiEdit />
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          }>
          {app.keys && (
            <CollapsibleContent className="pt-4">
              {!!app.keys && typeof app.keys === "object" && (
                <Form
                  form={formMethods}
                  handleSubmit={(values) =>
                    saveKeysMutation.mutate({
                      slug: app.slug,
                      type: app.type,
                      keys: values,
                      dirName: app.dirName,
                    })
                  }
                  className="px-4 pb-4">
                  {Object.keys(app.keys).map((key) => (
                    <Controller
                      name={key}
                      key={key}
                      control={formMethods.control}
                      defaultValue={app.keys && app.keys[key] ? app?.keys[key] : ""}
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
                  <Button type="submit" loading={saveKeysMutation.isLoading}>
                    {t("save")}
                  </Button>
                </Form>
              )}
            </CollapsibleContent>
          )}
        </AppListCard>

        <Dialog open={disableDialog} onOpenChange={setDisableDialog}>
          <ConfirmationDialogContent
            title={t("disable_app")}
            variety="danger"
            onConfirm={() => {
              enableAppMutation.mutate({ slug: app.slug, enabled: app.enabled });
            }}>
            {t("disable_app_description")}
          </ConfirmationDialogContent>
        </Dialog>
      </Collapsible>
    </li>
  );
};

const querySchema = z.object({
  category: z
    .nativeEnum({ ...AppCategories, conferencing: "conferencing" })
    .optional()
    .default(AppCategories.calendar),
});

const AdminAppsList = ({
  baseURL,
  className,
  useQueryParam = false,
}: {
  baseURL: string;
  className?: string;
  useQueryParam?: boolean;
}) => {
  const router = useRouter();
  return (
    <form
      id="wizard-step-2"
      name="wizard-step-2"
      onSubmit={(e) => {
        e.preventDefault();
        router.replace("/");
      }}>
      <AppCategoryNavigation
        baseURL={baseURL}
        fromAdmin
        useQueryParam={useQueryParam}
        containerClassname="min-w-0 w-full"
        className={className}>
        <AdminAppsListContainer />
      </AppCategoryNavigation>
    </form>
  );
};

const AdminAppsListContainer = () => {
  const { t } = useLocale();
  const router = useRouter();
  const { category } = querySchema.parse(router.query);
  const { data: apps, isLoading } = trpc.viewer.appsRouter.listLocal.useQuery(
    { category },
    { enabled: router.isReady }
  );

  if (isLoading) return <SkeletonLoader />;

  if (!apps) {
    return (
      <EmptyScreen
        Icon={FiAlertCircle}
        headline={t("no_available_apps")}
        description={t("no_available_apps_description")}
      />
    );
  }

  return (
    <List>
      {apps.map((app) => (
        <IntegrationContainer app={app} key={app.name} category={category} />
      ))}
    </List>
  );
};

export default AdminAppsList;

const SkeletonLoader = () => {
  return (
    <SkeletonContainer className="w-[30rem] pr-10">
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
