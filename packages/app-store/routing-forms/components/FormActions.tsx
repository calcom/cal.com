import type { App_RoutingForms_Form } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { createContext, forwardRef, useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { RoutingFormEmbedButton, RoutingFormEmbedDialog } from "@calcom/features/embed/RoutingFormEmbed";
import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";
import {
  Button,
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Form,
  SettingsToggle,
  showToast,
  Switch,
  TextAreaField,
  TextField,
} from "@calcom/ui";
import { MoreHorizontal } from "@calcom/ui/components/icon";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import type { SerializableForm } from "../types/types";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

const newFormModalQuerySchema = z.object({
  action: z.literal("new").or(z.literal("duplicate")),
  target: z.string().optional(),
});

export const useOpenModal = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const openModal = (option: z.infer<typeof newFormModalQuerySchema>) => {
    const newQuery = new URLSearchParams(searchParams ?? undefined);
    newQuery.set("dialog", "new-form");
    Object.keys(option).forEach((key) => {
      newQuery.set(key, option[key as keyof typeof option] || "");
    });
    router.push(`${pathname}?${newQuery.toString()}`);
  };
  return openModal;
};

function NewFormDialog({ appUrl }: { appUrl: string }) {
  const routerQuery = useRouterQuery();
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.viewer.appRoutingForms.formMutation.useMutation({
    onSuccess: (_data, variables) => {
      router.push(`${appUrl}/form-edit/${variables.id}`);
    },
    onError: (err) => {
      showToast(err.message || t("something_went_wrong"), "error");
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.forms.invalidate();
    },
  });

  const hookForm = useForm<{
    name: string;
    description: string;
    shouldConnect: boolean;
  }>();

  const { action, target } = routerQuery as z.infer<typeof newFormModalQuerySchema>;

  const formToDuplicate = action === "duplicate" ? target : null;
  const teamId = action === "new" ? Number(target) : null;

  const { register } = hookForm;
  return (
    <Dialog name="new-form" clearQueryParamsOnClose={["target", "action"]}>
      <DialogContent className="overflow-y-auto">
        <div className="mb-1">
          <h3
            className="text-emphasis !font-cal text-semibold leading-20 text-xl font-medium"
            id="modal-title">
            {teamId ? t("add_new_team_form") : t("add_new_form")}
          </h3>
          <div>
            <p className="text-subtle text-sm">{t("form_description")}</p>
          </div>
        </div>
        <Form
          form={hookForm}
          handleSubmit={(values) => {
            const formId = uuidv4();

            mutation.mutate({
              id: formId,
              ...values,
              addFallback: true,
              teamId,
              duplicateFrom: formToDuplicate,
            });
          }}>
          <div className="mt-3 space-y-5">
            <TextField label={t("title")} required placeholder={t("a_routing_form")} {...register("name")} />
            <div className="mb-5">
              <TextAreaField
                id="description"
                label={t("description")}
                {...register("description")}
                data-testid="description"
                placeholder={t("form_description_placeholder")}
              />
            </div>
            {action === "duplicate" && (
              <Controller
                name="shouldConnect"
                render={({ field: { value, onChange } }) => {
                  return (
                    <SettingsToggle
                      title={t("keep_me_connected_with_form")}
                      description={t("fields_in_form_duplicated")}
                      checked={value}
                      onCheckedChange={(checked) => {
                        onChange(checked);
                      }}
                    />
                  );
                }}
              />
            )}
          </div>
          <DialogFooter showDivider className="mt-12">
            <DialogClose />
            <Button loading={mutation.isLoading} data-testid="add-form" type="submit">
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const dropdownCtx = createContext<{ dropdown: boolean }>({ dropdown: false });
export const FormActionsDropdown = ({
  children,
  disabled,
}: {
  disabled?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <dropdownCtx.Provider value={{ dropdown: true }}>
      <Dropdown>
        <DropdownMenuTrigger disabled={disabled} data-testid="form-dropdown" asChild>
          <Button
            type="button"
            variant="icon"
            color="secondary"
            className={classNames("radix-state-open:rounded-r-md", disabled && "opacity-30")}
            StartIcon={MoreHorizontal}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent>{children}</DropdownMenuContent>
      </Dropdown>
    </dropdownCtx.Provider>
  );
};

function Dialogs({
  appUrl,
  deleteDialogOpen,
  setDeleteDialogOpen,
  deleteDialogFormId,
}: {
  appUrl: string;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteDialogFormId: string | null;
}) {
  const utils = trpc.useContext();
  const router = useRouter();
  const { t } = useLocale();
  const deleteMutation = trpc.viewer.appRoutingForms.deleteForm.useMutation({
    onMutate: async ({ id: formId }) => {
      await utils.viewer.appRoutingForms.forms.cancel();
      const previousValue = utils.viewer.appRoutingForms.forms.getData();
      if (previousValue) {
        const filtered = previousValue.filtered.filter(({ form: { id } }) => id !== formId);
        utils.viewer.appRoutingForms.forms.setData(
          {},
          {
            ...previousValue,
            filtered,
          }
        );
      }
      return { previousValue };
    },
    onSuccess: () => {
      showToast(t("form_deleted"), "success");
      setDeleteDialogOpen(false);
      router.push(`${appUrl}/forms`);
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.forms.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (err, newTodo, context) => {
      if (context?.previousValue) {
        utils.viewer.appRoutingForms.forms.setData({}, context.previousValue);
      }
      showToast(err.message || t("something_went_wrong"), "error");
    },
  });
  return (
    <div id="form-dialogs">
      <RoutingFormEmbedDialog />
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          isLoading={deleteMutation.isLoading}
          variety="danger"
          title={t("delete_form")}
          confirmBtnText={t("delete_form_action")}
          loadingText={t("delete_form_action")}
          onConfirm={(e) => {
            if (!deleteDialogFormId) {
              return;
            }
            e.preventDefault();
            deleteMutation.mutate({
              id: deleteDialogFormId,
            });
          }}>
          <ul className="list-disc pl-3">
            <li> {t("delete_form_confirmation")}</li>
            <li> {t("delete_form_confirmation_2")}</li>
          </ul>
        </ConfirmationDialogContent>
      </Dialog>
      <NewFormDialog appUrl={appUrl} />
    </div>
  );
}

const actionsCtx = createContext({
  appUrl: "",
  _delete: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    onAction: (_arg: { routingForm: RoutingForm | null }) => {},
    isLoading: false,
  },
  toggle: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    onAction: (_arg: { routingForm: RoutingForm | null; checked: boolean }) => {},
    isLoading: false,
  },
});

export function FormActionsProvider({ appUrl, children }: { appUrl: string; children: React.ReactNode }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogFormId, setDeleteDialogFormId] = useState<string | null>(null);
  const { t } = useLocale();
  const utils = trpc.useContext();

  const toggleMutation = trpc.viewer.appRoutingForms.formMutation.useMutation({
    onMutate: async ({ id: formId, disabled }) => {
      await utils.viewer.appRoutingForms.forms.cancel();
      const previousValue = utils.viewer.appRoutingForms.forms.getData();
      if (previousValue) {
        const formIndex = previousValue.filtered.findIndex(({ form: { id } }) => id === formId);
        const previousListOfForms = [...previousValue.filtered];

        if (formIndex !== -1 && previousListOfForms[formIndex] && disabled !== undefined) {
          previousListOfForms[formIndex].form.disabled = disabled;
        }
        utils.viewer.appRoutingForms.forms.setData(
          {},
          {
            filtered: previousListOfForms,
            totalCount: previousValue.totalCount,
          }
        );
      }
      return { previousValue };
    },
    onSuccess: () => {
      showToast(t("form_updated_successfully"), "success");
    },
    onSettled: (routingForm) => {
      utils.viewer.appRoutingForms.forms.invalidate();
      if (routingForm) {
        utils.viewer.appRoutingForms.formQuery.invalidate({
          id: routingForm.id,
        });
      }
    },
    onError: (err, value, context) => {
      if (context?.previousValue) {
        utils.viewer.appRoutingForms.forms.setData({}, context.previousValue);
      }
      showToast(err.message || t("something_went_wrong"), "error");
    },
  });

  return (
    <>
      <actionsCtx.Provider
        value={{
          appUrl,
          _delete: {
            onAction: ({ routingForm }) => {
              if (!routingForm) {
                return;
              }
              setDeleteDialogOpen(true);
              setDeleteDialogFormId(routingForm.id);
            },
            isLoading: false,
          },
          toggle: {
            onAction: ({ routingForm, checked }) => {
              if (!routingForm) {
                return;
              }
              toggleMutation.mutate({
                ...routingForm,
                disabled: !checked,
              });
            },
            isLoading: toggleMutation.isLoading,
          },
        }}>
        {children}
      </actionsCtx.Provider>
      <Dialogs
        appUrl={appUrl}
        deleteDialogFormId={deleteDialogFormId}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
      />
    </>
  );
}

type FormActionType =
  | "preview"
  | "edit"
  | "copyLink"
  | "toggle"
  | "_delete"
  | "embed"
  | "duplicate"
  | "download"
  | "copyRedirectUrl"
  | "create";

type FormActionProps<T> = {
  routingForm: RoutingForm | null;
  as?: T;
  label?: string;
  //TODO: Provide types here
  action: FormActionType;
  children?: React.ReactNode;
  render?: (props: {
    routingForm: RoutingForm | null;
    className?: string;
    label?: string;
    disabled?: boolean | null | undefined;
  }) => JSX.Element;
  extraClassNames?: string;
} & ButtonProps;

export const FormAction = forwardRef(function FormAction<T extends typeof Button>(
  props: FormActionProps<T>,
  forwardedRef: React.ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
) {
  const {
    action: actionName,
    routingForm,
    children,
    as: asFromElement,
    extraClassNames,
    ...additionalProps
  } = props;
  const { appUrl, _delete, toggle } = useContext(actionsCtx);
  const dropdownCtxValue = useContext(dropdownCtx);
  const dropdown = dropdownCtxValue?.dropdown;
  const embedLink = `forms/${routingForm?.id}`;
  const orgBranding = useOrgBranding();

  const formLink = `${orgBranding?.fullDomain ?? CAL_URL}/${embedLink}`;
  let redirectUrl = `${orgBranding?.fullDomain ?? CAL_URL}/router?form=${routingForm?.id}`;

  routingForm?.fields?.forEach((field) => {
    redirectUrl += `&${getFieldIdentifier(field)}={Recalled_Response_For_This_Field}`;
  });

  const { t } = useLocale();
  const openModal = useOpenModal();
  const actionData: Record<
    FormActionType,
    ButtonProps & { as?: React.ElementType; render?: FormActionProps<unknown>["render"] }
  > = {
    preview: {
      href: formLink,
    },
    copyLink: {
      onClick: () => {
        showToast(t("link_copied"), "success");
        navigator.clipboard.writeText(formLink);
      },
    },
    duplicate: {
      onClick: () => openModal({ action: "duplicate", target: routingForm?.id }),
    },
    embed: {
      as: RoutingFormEmbedButton,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      embedUrl: embedLink,
      // We are okay with namespace clashing here if just in case names clash
      namespace: slugify((routingForm?.name || "").substring(0, 5)),
    },
    edit: {
      href: `${appUrl}/form-edit/${routingForm?.id}`,
    },
    download: {
      href: `/api/integrations/routing-forms/responses/${routingForm?.id}`,
    },
    _delete: {
      onClick: () => _delete.onAction({ routingForm }),
      loading: _delete.isLoading,
    },
    create: {
      onClick: () => openModal({ action: "new", target: "" }),
    },
    copyRedirectUrl: {
      onClick: () => {
        navigator.clipboard.writeText(redirectUrl);
        showToast(t("typeform_redirect_url_copied"), "success");
      },
    },
    toggle: {
      render: ({ routingForm, label = "", disabled, ...restProps }) => {
        if (!routingForm) {
          return <></>;
        }
        return (
          <div
            {...restProps}
            className={classNames(
              "sm:hover:bg-subtle self-center rounded-md p-2 hover:bg-gray-200",
              extraClassNames
            )}>
            <Switch
              disabled={!!disabled}
              checked={!routingForm.disabled}
              label={label}
              onCheckedChange={(checked) => toggle.onAction({ routingForm, checked })}
              labelOnLeading
            />
          </div>
        );
      },
      loading: toggle.isLoading,
    },
  };

  const { as: asFromAction, ...action } = actionData[actionName];
  const as = asFromElement || asFromAction;
  const actionProps = {
    ...action,
    ...(additionalProps as ButtonProps),
  } as ButtonProps & { render?: FormActionProps<unknown>["render"] };
  if (actionProps.render) {
    return actionProps.render({
      routingForm,
      ...additionalProps,
    });
  }

  const Component = as || Button;
  if (!dropdown) {
    return (
      <Component data-testid={`form-action-${actionName}`} ref={forwardedRef} {...actionProps}>
        {children}
      </Component>
    );
  }
  return (
    <DropdownMenuItem>
      <Component
        ref={forwardedRef}
        {...actionProps}
        className={classNames(
          props.className,
          "w-full transition-none",
          props.color === "destructive" && "border-0"
        )}>
        {children}
      </Component>
    </DropdownMenuItem>
  );
});
