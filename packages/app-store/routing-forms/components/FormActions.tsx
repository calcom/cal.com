import type { App_RoutingForms_Form } from "@prisma/client";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import { createContext, forwardRef, useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";
import {
  Button,
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Form,
  showToast,
  Switch,
  TextAreaField,
  TextField,
  SettingsToggle,
} from "@calcom/ui";
import { MoreHorizontal } from "@calcom/ui/components/icon";

import { EmbedButton, EmbedDialog } from "@components/Embed";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import type { SerializableForm } from "../types/types";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

const newFormModalQuerySchema = z.object({
  action: z.string(),
  target: z.string().optional(),
});

const openModal = (router: NextRouter, option: { target?: string; action: string }) => {
  const query = {
    ...router.query,
    dialog: "new-form",
    ...option,
  };
  router.push(
    {
      pathname: router.pathname,
      query,
    },
    undefined,
    { shallow: true }
  );
};

function NewFormDialog({ appUrl }: { appUrl: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.viewer.appRoutingForms.formMutation.useMutation({
    onSuccess: (_data, variables) => {
      router.push(`${appUrl}/form-edit/${variables.id}`);
    },
    onError: () => {
      showToast(t("something_went_wrong"), "error");
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

  const { action, target } = router.query as z.infer<typeof newFormModalQuerySchema>;

  const { register } = hookForm;
  return (
    <Dialog name="new-form" clearQueryParamsOnClose={["target", "action"]}>
      <DialogContent className="overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-emphasis text-lg font-bold leading-6" id="modal-title">
            {t("add_new_form")}
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
              duplicateFrom: action === "duplicate" ? target : null,
            });
          }}>
          <div className="mt-3 space-y-4">
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
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button loading={mutation.isLoading} data-testid="add-form" type="submit">
              {t("continue")}
            </Button>
            <DialogClose />
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const dropdownCtx = createContext<{ dropdown: boolean }>({ dropdown: false });

export const FormActionsDropdown = ({ form, children }: { form: RoutingForm; children: React.ReactNode }) => {
  const { disabled } = form;
  return (
    <dropdownCtx.Provider value={{ dropdown: true }}>
      <Dropdown>
        <DropdownMenuTrigger data-testid="form-dropdown" asChild>
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
        const filtered = previousValue.filter(({ id }) => id !== formId);
        utils.viewer.appRoutingForms.forms.setData(undefined, filtered);
      }
      return { previousValue };
    },
    onSuccess: () => {
      showToast(t("form_deleted"), "success");
      setDeleteDialogOpen(false);
      router.replace(`${appUrl}/forms`);
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.forms.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (err, newTodo, context) => {
      if (context?.previousValue) {
        utils.viewer.appRoutingForms.forms.setData(undefined, context.previousValue);
      }
      showToast(err.message || t("something_went_wrong"), "error");
    },
  });
  return (
    <div id="form-dialogs">
      <EmbedDialog />
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
        const itemIndex = previousValue.findIndex(({ id }) => id === formId);
        const prevValueTemp = [...previousValue];

        if (itemIndex !== -1 && prevValueTemp[itemIndex] && disabled !== undefined) {
          prevValueTemp[itemIndex].disabled = disabled;
        }
        utils.viewer.appRoutingForms.forms.setData(undefined, prevValueTemp);
      }
      return { previousValue };
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.forms.invalidate();
    },
    onError: (err, value, context) => {
      if (context?.previousValue) {
        utils.viewer.appRoutingForms.forms.setData(undefined, context.previousValue);
      }
      showToast(t("something_went_wrong"), "error");
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
  render?: (props: { routingForm: RoutingForm | null; className?: string; label?: string }) => JSX.Element;
} & ButtonProps;

export const FormAction = forwardRef(function FormAction<T extends typeof Button>(
  props: FormActionProps<T>,
  forwardedRef: React.ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
) {
  const { action: actionName, routingForm, children, as: asFromElement, ...additionalProps } = props;
  const { appUrl, _delete, toggle } = useContext(actionsCtx);
  const dropdownCtxValue = useContext(dropdownCtx);
  const dropdown = dropdownCtxValue?.dropdown;
  const embedLink = `forms/${routingForm?.id}`;
  const formLink = `${CAL_URL}/${embedLink}`;
  let redirectUrl = `${CAL_URL}/router?form=${routingForm?.id}`;

  routingForm?.fields?.forEach((field) => {
    redirectUrl += `&${getFieldIdentifier(field)}={Recalled_Response_For_This_Field}`;
  });

  const { t } = useLocale();
  const router = useRouter();
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
      onClick: () => openModal(router, { action: "duplicate", target: routingForm?.id }),
    },
    embed: {
      as: EmbedButton,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      embedUrl: embedLink,
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
      onClick: () => openModal(router, { action: "new" }),
    },
    copyRedirectUrl: {
      onClick: () => {
        navigator.clipboard.writeText(redirectUrl);
        showToast(t("typeform_redirect_url_copied"), "success");
      },
    },
    toggle: {
      render: ({ routingForm, label = "", ...restProps }) => {
        if (!routingForm) {
          return <></>;
        }
        return (
          <div {...restProps} className="hover:bg-emphasis self-center rounded-md p-2">
            <Switch
              checked={!routingForm.disabled}
              label={label}
              onCheckedChange={(checked) => toggle.onAction({ routingForm, checked })}
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
      <Component ref={forwardedRef} {...actionProps}>
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
