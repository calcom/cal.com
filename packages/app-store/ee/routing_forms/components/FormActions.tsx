import { useRouter } from "next/router";
import { useState, createContext, useContext } from "react";
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
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Form,
  showToast,
  Switch,
  TextField,
} from "@calcom/ui/v2";

import { EmbedButton, EmbedDialog } from "@components/Embed";

const newFormModalQuerySchema = z.object({
  action: z.string(),
  target: z.string().optional(),
});

const openModal = (router, option: { target?: string; action: string }) => {
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

const dropdownCtx = createContext();
export const FormActionsDropdown = ({ form, children }) => {
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

function Dialogs({ appUrl, deleteDialogOpen, setDeleteDialogOpen, deleteDialogFormId }) {
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

const actionsCtx = createContext();

export function FormActionsProvider({ appUrl, children }) {
  const onDelete = ({ form }) => {
    setDeleteDialogOpen(true);
    setDeleteDialogFormId(form.id);
  };

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

  const saveMutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
  });

  const onSave = ({ form }) => {
    saveMutation.mutate(form);
  };
  onSave.mutation = saveMutation;
  const onToggle = ({ form, checked }) => {
    toggleMutation.mutate({
      ...form,
      disabled: !checked,
    });
  };
  onToggle.mutation = toggleMutation;
  return (
    <>
      <actionsCtx.Provider
        value={{
          appUrl,
          onDelete,
          onSave,
          onToggle,
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

export const FormAction = function FormAction(props) {
  const { action: actionName, form, children, ...additionalProps } = props;
  const { appUrl, onDelete, onToggle, onSave } = useContext(actionsCtx);
  const dropdownCtxValue = useContext(dropdownCtx);
  const dropdown = dropdownCtxValue?.dropdown;
  const embedLink = `forms/${form?.id}`;
  const formLink = `${CAL_URL}/${embedLink}`;
  const { t } = useLocale();
  const router = useRouter();
  const actionData = {
    preview: {
      link: formLink,
    },
    copyLink: {
      onClick: () => {
        showToast(t("link_copied"), "success");
        navigator.clipboard.writeText(formLink);
      },
    },
    duplicate: {
      onClick: () => openModal(router, { action: "duplicate", target: form?.id }),
    },
    embed: {
      embedUrl: embedLink,
      as: EmbedButton,
    },
    edit: {
      link: `${appUrl}/form-edit/${form?.id}`,
    },
    download: {
      link: `/api/integrations/routing_forms/responses/${form?.id}`,
    },
    _delete: {
      onClick: () => onDelete({ form }),
      isLoading: onDelete.mutation?.isLoading,
    },
    save: {
      onClick: () => onSave({ form }),
      isLoading: onSave.mutation.isLoading,
    },
    create: {
      onClick: () => openModal(router, { action: "new" }),
    },
    toggle: {
      onClick: () => onToggle({ form }),
      render: ({ form, className, label }) => {
        return (
          <div className={className}>
            <Switch
              checked={!form.disabled}
              label={label}
              onCheckedChange={(checked) => onToggle({ form, checked })}
            />
          </div>
        );
      },
      isLoading: onToggle.mutation.isLoading,
    },
  };

  const action = actionData[actionName];

  let actionProps = {
    href: action.link,
    onClick: action.onClick,
    ...action,
    ...additionalProps,
  };

  if (actionProps.render) {
    return actionProps.render({
      form,
      ...additionalProps,
    });
  }

  if (!action) {
    console.error(actionName, "is not a valid action");
  }
  const Component = actionProps.as || Button;

  if (actionProps.as) {
    actionProps = {
      ...actionProps,
      as: Button,
    };
  }

  if (!dropdown) {
    return (
      <Component {...actionProps} loading={action.isLoading}>
        {children}
      </Component>
    );
  }

  return (
    <DropdownMenuItem className="outline-none">
      <Component {...actionProps}>{children}</Component>
    </DropdownMenuItem>
  );
};
