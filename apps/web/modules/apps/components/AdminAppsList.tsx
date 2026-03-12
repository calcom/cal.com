"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import type { FC } from "react";
import { useEffect, useReducer, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AppCategories } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardPanel,
} from "@coss/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import {
  Field,
  FieldControl,
  FieldError,
  FieldLabel,
} from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@coss/ui/shared/list-item";
import { cn } from "@coss/ui/lib/utils";
import { Switch } from "@coss/ui/components/switch";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { CircleAlertIcon } from "@coss/ui/icons";
import { Skeleton } from "@coss/ui/components/skeleton";
import { toastManager } from "@coss/ui/components/toast";

type App = RouterOutputs["viewer"]["apps"]["listLocal"][number];

const IntegrationContainer = ({
  app,
  category,
  handleModelOpen,
}: {
  app: App;
  category: string;
  handleModelOpen: (data: EditModalState) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [disableDialog, setDisableDialog] = useState(false);

  const showKeyModal = (fromEnabled?: boolean) => {
    if (app.keys) {
      handleModelOpen({
        dirName: app.dirName,
        keys: app.keys,
        slug: app.slug,
        type: app.type,
        isOpen: "editKeys",
        fromEnabled,
        appName: app.name,
      });
    }
  };

  const enableAppMutation = trpc.viewer.apps.toggle.useMutation({
    onSuccess: (enabled) => {
      utils.viewer.apps.listLocal.invalidate({ category });
      setDisableDialog(false);
      toastManager.add({
        title: enabled
          ? t("app_is_enabled", { appName: app.name })
          : t("app_is_disabled", { appName: app.name }),
        type: "success",
      });
      if (enabled) {
        showKeyModal();
      }
    },
    onError: (error) => {
      toastManager.add({ title: error.message, type: "error" });
    },
  });

  return (
    <>
      <ListItem>
        <ListItemContent>
          <div className="flex min-w-0 items-start gap-4">
            {app.logo ? (
              <Image
                alt={`${app.name} logo`}
                className={cn("h-10 w-10 shrink-0", app.logo.includes("-dark") && "dark:invert")}
                src={app.logo}
                width={40}
                height={40}
              />
            ) : (
              <div
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-muted-foreground text-lg">?</span>
              </div>
            )}
            <ListItemHeader>
              <div className="flex flex-wrap items-center gap-2">
                <ListItemTitle>{app.name}</ListItemTitle>
                <ListItemBadges>
                  {app.isTemplate && (
                    <Badge variant="destructive">Template</Badge>
                  )}
                </ListItemBadges>
              </div>
              <ListItemDescription>
                {app.description}
              </ListItemDescription>
              {app.keys && (
                <Button
                  aria-label={t("edit_keys")}
                  className="mt-2 w-fit"
                  onClick={() => showKeyModal()}
                  size="xs"
                  variant="outline">
                  {t("edit_keys")}
                </Button>
              )}
            </ListItemHeader>
          </div>
        </ListItemContent>
        <ListItemActions>
          <Switch
            checked={app.enabled}
            onCheckedChange={(checked) => {
              if (!checked) {
                setDisableDialog(true);
              } else if (app.keys) {
                showKeyModal(true);
              } else {
                enableAppMutation.mutate({ slug: app.slug, enabled: true });
              }
            }}
          />
        </ListItemActions>
      </ListItem>

      <AlertDialog open={disableDialog} onOpenChange={setDisableDialog}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disable_app")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("disable_app_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              {t("cancel")}
            </AlertDialogClose>
            <AlertDialogClose
              onClick={() =>
                enableAppMutation.mutate({ slug: app.slug, enabled: !app.enabled })
              }
              render={<Button />}>
              {t("confirm")}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
};

export type AdminAppsListClassNames = {
  form?: string;
  appCategoryNavigationContainer?: string;
  verticalTabsItem?: string;
};

const AdminAppsList = ({
  baseURL,
  useQueryParam = false,
  onSubmit = noop,
  nav,
  classNames,
  ...rest
}: {
  baseURL: string;
  useQueryParam?: boolean;
  onSubmit?: () => void;
  nav?: { onNext: () => void; onPrev: () => void };
  classNames?: AdminAppsListClassNames;
} & Omit<JSX.IntrinsicElements["form"], "onSubmit">) => {
  const { t } = useLocale();
  const searchParams = useCompatSearchParams();
  const category = searchParams?.get("category") || AppCategories.calendar;
  const { data: apps, isPending } = trpc.viewer.apps.listLocal.useQuery(
    { category },
    { enabled: searchParams !== null }
  );

  const isEmpty = !isPending && (!apps || apps.length === 0);

  return (
    <form
      {...rest}
      className={classNames?.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        nav?.onNext();
      }}>
      <AppCategoryNavigation
        baseURL={baseURL}
        useQueryParam={useQueryParam}
        classNames={
          classNames
            ? {
                contentContainer: classNames.appCategoryNavigationContainer,
                verticalTabsItem: classNames.verticalTabsItem,
              }
            : undefined
        }
      >
        {isEmpty ? (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>{t("no_available_apps")}</EmptyTitle>
              <EmptyDescription>{t("no_available_apps_description")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card>
            <CardPanel className="p-0">
              {isPending ? (
                <SkeletonContent />
              ) : (
                apps && <AdminAppsListContainer apps={apps} category={category} />
              )}
            </CardPanel>
          </Card>
        )}
      </AppCategoryNavigation>
      {nav && (
        <div className="flex justify-end gap-2 px-4 py-4">
          <Button type="button" variant="secondary" onClick={nav.onPrev}>
            {t("prev_step")}
          </Button>
          <Button type="submit">
            {t("finish")}
          </Button>
        </div>
      )}
    </form>
  );
};

const EditKeysModal: FC<{
  dirName: string;
  slug: string;
  type: string;
  isOpen: boolean;
  keys: App["keys"];
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onClose: () => void;
  fromEnabled?: boolean;
  appName?: string;
}> = (props) => {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const {
    dirName,
    slug,
    type,
    isOpen,
    keys,
    onOpenChange,
    onOpenChangeComplete,
    onClose,
    fromEnabled,
    appName,
  } = props;
  const appKeySchema =
    appKeysSchemas[dirName as keyof typeof appKeysSchemas] ??
    z.record(z.string());

  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(appKeySchema),
    defaultValues: keys && typeof keys === "object" ? keys : {},
  });

  useEffect(() => {
    if (keys && typeof keys === "object") {
      reset(keys);
    }
  }, [keys, reset]);

  const saveKeysMutation = trpc.viewer.apps.saveKeys.useMutation({
    onSuccess: () => {
      toastManager.add({
        title: fromEnabled ? t("app_is_enabled", { appName }) : t("keys_have_been_saved"),
        type: "success",
      });
      utils.viewer.apps.listLocal.invalidate();
      onClose();
    },
    onError: (error) => {
      toastManager.add({ title: error.message, type: "error" });
    },
  });

  const submitForm = (data: Record<string, unknown>) => {
    const keys = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [
        k,
        typeof v === "string" ? v : String(v ?? ""),
      ])
    );
    saveKeysMutation.mutate({
      slug,
      type,
      keys,
      dirName,
      fromEnabled,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("edit_keys")}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4 px-6 pb-6">
          {keys && typeof keys === "object" && (
            <Form
              aria-label={t("edit_keys")}
              id="edit-keys"
              onSubmit={handleSubmit(submitForm)}
              className="flex flex-col gap-4">
              {Object.keys(keys).map((key) => (
                <Controller
                  key={key}
                  name={key}
                  control={control}
                  render={({
                    field: { ref, value, onBlur, onChange },
                    fieldState: { invalid, isTouched, isDirty, error },
                  }) => (
                    <Field
                      dirty={isDirty}
                      invalid={invalid}
                      name={key}
                      touched={isTouched}>
                      <FieldLabel>{t(key)}</FieldLabel>
                      <FieldControl
                        ref={ref}
                        value={String(value ?? "")}
                        onBlur={onBlur}
                        onValueChange={onChange}
                        render={<Input />}
                      />
                      <FieldError match={!!error}>{error?.message}</FieldError>
                    </Field>
                  )}
                />
              ))}
            </Form>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t("close")}
          </DialogClose>
          <Button form="edit-keys" type="submit">
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

interface EditModalState extends Pick<App, "keys"> {
  isOpen: "none" | "editKeys" | "disableKeys";
  dirName: string;
  type: string;
  slug: string;
  fromEnabled?: boolean;
  appName?: string;
}

const AdminAppsListContainer = ({
  apps,
  category,
}: {
  apps: App[];
  category: string;
}) => {
  const [modalState, setModalState] = useReducer(
    (data: EditModalState, partialData: Partial<EditModalState>) => ({ ...data, ...partialData }),
    {
      keys: null,
      isOpen: "none",
      dirName: "",
      type: "",
      slug: "",
    }
  );

  const [editKeysDialogOpen, setEditKeysDialogOpen] = useState(false);

  const closeEditKeysDialog = () => setEditKeysDialogOpen(false);

  const clearEditKeysModalState = () =>
    setModalState({ keys: null, isOpen: "none", dirName: "", slug: "", type: "" });

  const handleModelOpen = (data: EditModalState) => {
    setModalState({ ...data });
    setEditKeysDialogOpen(true);
  };

  return (
    <>
      {apps.map((app) => (
        <IntegrationContainer
          app={app}
          category={category}
          handleModelOpen={handleModelOpen}
          key={app.name}
        />
      ))}
      <EditKeysModal
        dirName={modalState.dirName}
        isOpen={editKeysDialogOpen}
        keys={modalState.keys}
        onClose={closeEditKeysDialog}
        onOpenChange={setEditKeysDialogOpen}
        onOpenChangeComplete={(open) => !open && clearEditKeysModalState()}
        slug={modalState.slug}
        type={modalState.type}
        fromEnabled={modalState.fromEnabled}
        appName={modalState.appName}
      />
    </>
  );
};

export default AdminAppsList;

const SkeletonContent = () => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <ListItem key={i}>
        <ListItemContent>
          <div className="flex min-w-0 items-start gap-4">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 flex flex-col gap-1">
              <Skeleton className="my-0.5 h-4 w-32" />
              <div>
                <Skeleton className="my-1 h-3.5 w-full" />
                <Skeleton className="my-1 h-3.5 w-3/4" />
              </div>
            </div>
          </div>
        </ListItemContent>
        <ListItemActions>
          <Skeleton className="h-4.5 w-7.5 shrink-0 rounded-full" />
        </ListItemActions>
      </ListItem>
    ))}
  </>
);
