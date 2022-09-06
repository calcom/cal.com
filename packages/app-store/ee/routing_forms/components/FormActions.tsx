import { useRouter } from "next/router";
import type { NextRouter } from "next/router";
import { useState, createContext, useContext, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Dialog, DialogClose, DialogContent } from "@calcom/ui/Dialog";
import {
  Button,
  ButtonProps,
  Dropdown,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Form,
  showToast,
  Switch,
  TextField,
} from "@calcom/ui/v2";

import { EmbedButton, EmbedDialog } from "@components/Embed";

import { SerializableForm } from "../types/types";
import { App_RoutingForms_Form } from ".prisma/client";

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

  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess: (_data, variables) => {
      utils.invalidateQueries("viewer.app_routing_forms.forms");
      router.push(`${appUrl}/form-edit/${variables.id}`);
    },
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
  });

  const hookForm = useForm<{
    name: string;
    description: string;
  }>();

  const { action, target } = router.query as z.infer<typeof newFormModalQuerySchema>;

  const { register } = hookForm;
  return (
    <Dialog name="new-form" clearQueryParamsOnClose={["target", "action"]}>
      <DialogContent className="overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            Add New Form
          </h3>
          <div>
            <p className="text-sm text-gray-500">Create your form to route a booker</p>
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
            <TextField label={t("title")} required placeholder="A Routing Form" {...register("name")} />
            <div className="mb-5">
              <h3 className="mb-2 text-base font-medium leading-6 text-gray-900">Description</h3>
              <div className="w-full">
                <textarea
                  id="description"
                  data-testid="description"
                  className="block w-full rounded-sm border-gray-300 text-sm "
                  placeholder="Form Description"
                  {...register("description")}
                />
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button loading={mutation.isLoading} data-testid="add-form" type="submit">
              {t("continue")}
            </Button>
            <DialogClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>
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
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            color="minimal"
            className={classNames(disabled && " opacity-30")}
            StartIcon={Icon.FiMoreHorizontal}
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
  const deleteMutation = trpc.useMutation("viewer.app_routing_forms.deleteForm", {
    onSuccess: () => {
      showToast("Form deleted", "success");
      setDeleteDialogOpen(false);
      router.replace(`${appUrl}/forms`);
    },
    onSettled: () => {
      utils.invalidateQueries(["viewer.app_routing_forms.forms"]);
      setDeleteDialogOpen(false);
    },
    onError: () => {
      showToast("Something went wrong", "error");
    },
  });
  return (
    <div id="form-dialogs">
      <EmbedDialog />
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          isLoading={deleteMutation.isLoading}
          variety="danger"
          title="Delete Form"
          confirmBtnText="Yes, delete Form"
          loadingText="Yes, delete Form"
          onConfirm={(e) => {
            if (!deleteDialogFormId) {
              return;
            }
            e.preventDefault();
            deleteMutation.mutate({
              id: deleteDialogFormId,
            });
          }}>
          Are you sure you want to delete this form? Anyone who you&apos;ve shared the link with will no
          longer be able to book using it. Also, all associated responses would be deleted.
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
  const router = useRouter();

  const toggleMutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
    onSuccess: () => {
      router.replace(router.asPath);
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
      href: `/api/integrations/routing_forms/responses/${routingForm?.id}`,
    },
    _delete: {
      onClick: () => _delete.onAction({ routingForm }),
      loading: _delete.isLoading,
    },
    create: {
      onClick: () => openModal(router, { action: "new" }),
    },
    toggle: {
      render: ({ routingForm, label = "", ...restProps }) => {
        if (!routingForm) {
          return <></>;
        }
        return (
          <div {...restProps}>
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
      <Component ref={forwardedRef} {...actionProps}>
        {children}
      </Component>
    </DropdownMenuItem>
  );
});
