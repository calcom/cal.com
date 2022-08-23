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
  Tooltip,
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

export const FormActionType = {
  save: ({ onSave, form }) => ({
    props: {
      color: "primary",
    },
    onClick: () => {
      onSave({ form });
    },
  }),
  create: ({ router }) => ({
    label: "New Form",
    icon: Icon.FiPlus,
    onClick: () => openModal(router, { action: "new" }),
  }),
  preview: ({ link, t }) => ({
    externalLink: link,
    icon: Icon.FiExternalLink,
    label: t("preview"),
  }),
  copyLink: ({ link, t }) => ({
    label: t("copy_link"),
    icon: Icon.FiLink,
    onClick: () => {
      showToast(t("link_copied"), "success");
      navigator.clipboard.writeText(link);
    },
  }),
  edit: ({ editRoute, t }) => ({
    label: t("edit"),
    icon: Icon.FiEdit2,
    link: editRoute,
  }),
  download: ({ downloadRoute, t }) => ({
    label: "Download Responses",
    icon: Icon.FiDownload,
    link: downloadRoute,
  }),
  embed: ({ embedLink, t }) => ({
    isEmbedButton: true,
    label: t("embed"),
    id: "embed",
    icon: Icon.FiCode,
    as: EmbedButton,
    props: {
      embedUrl: encodeURIComponent(embedLink),
    },
  }),
  duplicate: ({ router, form, t }) => ({
    isDuplicateButton: true,
    label: t("duplicate"),
    "data-testid": "routing-form-duplicate-" + form?.id,
    icon: Icon.FiCopy,
    onClick: () => openModal(router, { action: "duplicate", target: form?.id }),
  }),
  _delete: ({ onDelete, t }) => ({
    label: t("delete"),
    isDeleteButton: true,
    icon: Icon.FiTrash,
    props: {
      color: "destructive",
    },
    onClick: onDelete,
  }),
  toggle: () => ({
    props: {
      render: ({ onToggle, disabled, className, label }) => {
        return (
          <div className={className}>
            <Switch checked={!disabled} label={label} onCheckedChange={onToggle} />
          </div>
        );
      },
    },
  }),
};
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

  return (
    <>
      <actionsCtx.Provider
        value={{
          appUrl,
          onDelete,
          onSave,
          loading: saveMutation.isLoading || toggleMutation.isLoading,
          onToggle: ({ form, checked }) => {
            toggleMutation.mutate({
              ...form,
              disabled: !checked,
            });
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

export const FormAction = function FormAction(props) {
  const { action: actionFn, form, children, ...additionalProps } = props;
  const { appUrl, onDelete, onToggle, onSave, loading } = useContext(actionsCtx);
  const dropdownCtxValue = useContext(dropdownCtx);
  const dropdown = dropdownCtxValue?.dropdown;
  const disabled = form?.disabled;
  const embedLink = `forms/${form?.id}`;
  const formLink = `${CAL_URL}/${embedLink}`;
  const { t } = useLocale();
  const router = useRouter();
  const action = actionFn({
    form,
    link: formLink,
    t,
    router,
    embedLink,
    editRoute: `${appUrl}/form-edit/${form?.id}`,
    downloadRoute: `/api/integrations/routing_forms/responses/${form?.id}`,
    onDelete: () => onDelete({ form }),
    onSave: () => onSave({ form }),
  });

  let actionProps = {
    type: "button",
    size: !children ? "icon" : "base",
    color: "minimal",
    StartIcon: action.icon,
    // For Copy link
    // className={classNames(disabled && " opacity-30")}
    className: classNames(!disabled && "group-hover:text-black"),
    loading,
    ...action.props,
    ...additionalProps,
  };

  if (actionProps.render) {
    return actionProps.render({
      onToggle: (checked) => {
        return onToggle({ form, checked });
      },
      onDelete,
      disabled: form.disabled,
      form,
      ...additionalProps,
    });
  }

  if (action.externalLink) {
    actionProps = {
      ...actionProps,
      rel: "noreferrer",
      href: action.externalLink,
      StartIcon: actionProps.StartIcon || Icon.FiExternalLink,
      target: "_blank",
    };
  } else {
    if (action.link) {
      actionProps = {
        ...actionProps,
        href: action.link,
        StartIcon: actionProps.StartIcon,
      };
    }
  }
  if (action.onClick) {
    actionProps = {
      ...actionProps,
      onClick: action.onClick,
    };
  }

  const Component = action.as || Button;
  if (action.as) {
    actionProps = {
      ...actionProps,
      as: Button,
    };
  }

  if (!dropdown) {
    return (
      <>
        {!children ? (
          <Tooltip content={action.label}>
            <Component {...actionProps}>{children}</Component>
          </Tooltip>
        ) : (
          <Component {...actionProps}>{children}</Component>
        )}
      </>
    );
  }
  actionProps = {
    type: "button",
    color: "minimal",
    StartIcon: action.icon,
    className: "rounded-none justify-left w-full",
    onClick: action.onClick,
    href: action.link || action.externalLink,
    disabled,
    ...action.props,
    ...additionalProps,
  };
  if (action.as) {
    actionProps = {
      ...actionProps,
      as: Button,
    };
  }
  return (
    <div>
      <DropdownMenuItem className="outline-none">
        <Component {...actionProps}>{action.label}</Component>
      </DropdownMenuItem>
    </div>
  );
};
