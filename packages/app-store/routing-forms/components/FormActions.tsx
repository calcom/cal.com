import { useRouter } from "next/navigation";
import { createContext, forwardRef, useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { RoutingFormEmbedButton, RoutingFormEmbedDialog } from "@calcom/features/embed/RoutingFormEmbed";
import { EmbedDialogProvider } from "@calcom/features/embed/lib/hooks/useEmbedDialogCtx";
import { classNames } from "@calcom/lib";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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

import getFieldIdentifier from "../lib/getFieldIdentifier";

type FormField = {
  identifier?: string;
  id: string;
  type: string;
  label: string;
  routerId?: string | null;
};

type RoutingForm = {
  id: string;
  name: string;
  disabled: boolean;
  fields?: FormField[];
};

export type NewFormDialogState = { action: "new" | "duplicate"; target: string | null } | null;
export type SetNewFormDialogState = React.Dispatch<React.SetStateAction<NewFormDialogState>>;

function NewFormDialog({
  appUrl,
  newFormDialogState,
  setNewFormDialogState,
}: {
  appUrl: string;
  newFormDialogState: NewFormDialogState;
  setNewFormDialogState: SetNewFormDialogState;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const action = newFormDialogState?.action;
  const target = newFormDialogState?.target;

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

  const formToDuplicate = action === "duplicate" ? target : null;
  const teamId = action === "new" ? Number(target) : null;

  const { register } = hookForm;
  return (
    <Dialog open={newFormDialogState !== null} onOpenChange={(open) => !open && setNewFormDialogState(null)}>
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
            <Button loading={mutation.isPending} data-testid="add-form" type="submit">
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
            StartIcon="ellipsis"
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
  newFormDialogState,
  setNewFormDialogState,
}: {
  appUrl: string;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteDialogFormId: string | null;
  newFormDialogState: NewFormDialogState | null;
  setNewFormDialogState: SetNewFormDialogState;
}) {
  const utils = trpc.useUtils();
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
          isPending={deleteMutation.isPending}
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
      <NewFormDialog
        appUrl={appUrl}
        newFormDialogState={newFormDialogState}
        setNewFormDialogState={setNewFormDialogState}
      />
    </div>
  );
}

const actionsCtx = createContext({
  appUrl: "",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setNewFormDialogState: null as SetNewFormDialogState | null,
  newFormDialogState: null as NewFormDialogState,
  _delete: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    onAction: (_arg: { routingForm: RoutingForm | null }) => {},
    isPending: false,
  },
  toggle: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    onAction: (_arg: { routingForm: RoutingForm | null; checked: boolean }) => {},
    isPending: false,
  },
});

interface FormActionsProviderProps {
  appUrl: string;
  children: React.ReactNode;
  newFormDialogState: NewFormDialogState;
  setNewFormDialogState: SetNewFormDialogState;
}

export function FormActionsProvider({
  appUrl,
  children,
  newFormDialogState,
  setNewFormDialogState,
}: FormActionsProviderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogFormId, setDeleteDialogFormId] = useState<string | null>(null);
  const { t } = useLocale();
  const utils = trpc.useUtils();
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
      <EmbedDialogProvider>
        <actionsCtx.Provider
          value={{
            appUrl,
            setNewFormDialogState,
            newFormDialogState,
            _delete: {
              onAction: ({ routingForm }) => {
                if (!routingForm) {
                  return;
                }
                setDeleteDialogOpen(true);
                setDeleteDialogFormId(routingForm.id);
              },
              isPending: false,
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
              isPending: toggleMutation.isPending,
            },
          }}>
          {children}
        </actionsCtx.Provider>
        <Dialogs
          appUrl={appUrl}
          deleteDialogFormId={deleteDialogFormId}
          deleteDialogOpen={deleteDialogOpen}
          setDeleteDialogOpen={setDeleteDialogOpen}
          newFormDialogState={newFormDialogState}
          setNewFormDialogState={setNewFormDialogState}
        />
      </EmbedDialogProvider>
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
  const { appUrl, _delete, toggle, setNewFormDialogState } = useContext(actionsCtx);
  const dropdownCtxValue = useContext(dropdownCtx);
  const dropdown = dropdownCtxValue?.dropdown;
  const embedLink = `forms/${routingForm?.id}`;
  const orgBranding = useOrgBranding();

  const formLink = `${orgBranding?.fullDomain ?? WEBSITE_URL}/${embedLink}`;
  let redirectUrl = `${orgBranding?.fullDomain ?? WEBSITE_URL}/router?form=${routingForm?.id}`;

  routingForm?.fields?.forEach((field) => {
    redirectUrl += `&${getFieldIdentifier(field)}={Recalled_Response_For_This_Field}`;
  });

  const { t } = useLocale();
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
      onClick: () => setNewFormDialogState?.({ action: "duplicate", target: routingForm?.id ?? null }),
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
      loading: _delete.isPending,
    },
    create: {
      onClick: () => setNewFormDialogState?.({ action: "new", target: "" }),
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
              "sm:hover:bg-subtle self-center rounded-md p-2 transition hover:bg-gray-200",
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
      loading: toggle.isPending,
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
    <DropdownMenuItem className="hover:bg-[initial]">
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
