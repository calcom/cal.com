import { TeamSelectionDialog } from "@calid/features/modules/teams/components/TeamSelectionDialog";
import { Button, type ButtonProps } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, forwardRef, useContext, useState } from "react";
import React from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

// import { Dialog } from "@calcom/features/components/controlled-dialog";
import { dataTableQueryParamsSerializer } from "@calcom/features/data-table/lib/serializers";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { RoutingFormEmbedButton, RoutingFormEmbedDialog } from "@calcom/features/embed/RoutingFormEmbed";
import { EmbedDialogProvider } from "@calcom/features/embed/lib/hooks/useEmbedDialogCtx";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Form } from "@calcom/ui/components/form";

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

export type SelectTeamDialogState = { target: string | null } | null;
export type SetSelectTeamDialogState = React.Dispatch<React.SetStateAction<SelectTeamDialogState>>;

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

  const mutation = trpc.viewer.appRoutingForms.calid_formMutation.useMutation({
    onSuccess: (_data, variables) => {
      router.push(`${appUrl}/form-edit/${variables.id}`);
    },
    onError: (err) => {
      triggerToast(err.message || t("something_went_wrong"), "error");
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.calid_forms.invalidate();
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
        <DialogHeader>
          <DialogTitle>{teamId ? t("add_new_team_form") : t("add_new_form")}</DialogTitle>
          <DialogDescription>{t("form_description")}</DialogDescription>
        </DialogHeader>
        <Form
          form={hookForm}
          handleSubmit={(values) => {
            const formId = uuidv4();

            mutation.mutate({
              id: formId,
              ...values,
              addFallback: true,
              calIdTeamId: teamId,
              duplicateFrom: formToDuplicate,
            });
          }}>
          <div className="mt-3 space-y-5">
            <div>
              <div className="text-emphasis mb-1 text-sm font-semibold" data-testid="description-label">
                {t("title")}
              </div>
              <Input required placeholder={t("a_routing_form")} {...register("name")} />
            </div>
            <div className="mb-5">
              <div className="text-emphasis mb-1 text-sm font-semibold" data-testid="description-label">
                {t("description")}
              </div>
              <TextArea
                id="description"
                {...register("description")}
                data-testid="description"
                placeholder={t("form_description_placeholder")}
                className="border-default text-default rounded-md border text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mt-12">
            <DialogClose />
            <Button loading={mutation.isPending} data-testid="add-form" type="submit" color="primary">
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
      <DropdownMenu>
        <DropdownMenuTrigger disabled={disabled} data-testid="form-dropdown" asChild>
          <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-40" align="end">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
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
  selectTeamDialogState,
  setSelectTeamDialogState,
}: {
  appUrl: string;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteDialogFormId: string | null;
  newFormDialogState: NewFormDialogState | null;
  setNewFormDialogState: SetNewFormDialogState;
  selectTeamDialogState: SelectTeamDialogState;
  setSelectTeamDialogState: SetSelectTeamDialogState;
}) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const { t } = useLocale();

  const deleteMutation = trpc.viewer.appRoutingForms.calid_deleteForm.useMutation({
    onMutate: async ({ id: formId }) => {
      await utils.viewer.appRoutingForms.calid_forms.cancel();
      const previousValue = utils.viewer.appRoutingForms.calid_forms.getData();
      if (previousValue) {
        const filtered = previousValue.filtered.filter(({ form: { id } }) => id !== formId);
        utils.viewer.appRoutingForms.calid_forms.setData(
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
      triggerToast(t("form_deleted"), "success");
      setDeleteDialogOpen(false);
      router.push(`${appUrl}/forms`);
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.calid_forms.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (err, newTodo, context) => {
      if (context?.previousValue) {
        utils.viewer.appRoutingForms.calid_forms.setData({}, context.previousValue);
      }
      triggerToast(err.message || t("something_went_wrong"), "error");
    },
  });

  return (
    <div id="form-dialogs">
      <RoutingFormEmbedDialog />
      <TeamSelectionDialog
        open={selectTeamDialogState !== null}
        openChange={(open: boolean) => !open && setSelectTeamDialogState(null)}
        onTeamSelect={(teamId: string) => {
          setSelectTeamDialogState(null);
          setNewFormDialogState({ action: "new", target: teamId });
        }}
      />
      <NewFormDialog
        appUrl={appUrl}
        newFormDialogState={newFormDialogState}
        setNewFormDialogState={setNewFormDialogState}
      />
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete_form")}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              color="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteDialogFormId) {
                  deleteMutation.mutate({ id: deleteDialogFormId });
                }
              }}>
              {t("delete")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const actionsCtx = createContext({
  appUrl: "",

  selectTeamDialogState: null as SelectTeamDialogState,
  setSelectTeamDialogState: null as SetSelectTeamDialogState | null,

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
  selectTeamDialogState: SelectTeamDialogState;
  setSelectTeamDialogState: SetSelectTeamDialogState;
}

export function FormActionsProvider({
  appUrl,
  children,
  newFormDialogState,
  setNewFormDialogState,
  selectTeamDialogState,
  setSelectTeamDialogState,
}: FormActionsProviderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogFormId, setDeleteDialogFormId] = useState<string | null>(null);
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const toggleMutation = trpc.viewer.appRoutingForms.calid_formMutation.useMutation({
    onMutate: async ({ id: formId, disabled }) => {
      await utils.viewer.appRoutingForms.calid_forms.cancel();
      const previousValue = utils.viewer.appRoutingForms.calid_forms.getData();
      if (previousValue) {
        const formIndex = previousValue.filtered.findIndex(({ form: { id } }) => id === formId);
        const previousListOfForms = [...previousValue.filtered];

        if (formIndex !== -1 && previousListOfForms[formIndex] && disabled !== undefined) {
          previousListOfForms[formIndex].form.disabled = disabled;
        }
        utils.viewer.appRoutingForms.calid_forms.setData(
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
      triggerToast(t("form_updated_successfully"), "success");
    },
    onSettled: (routingForm) => {
      utils.viewer.appRoutingForms.calid_forms.invalidate();
      if (routingForm) {
        utils.viewer.appRoutingForms.calid_formQuery.invalidate({
          id: routingForm.id,
        });
      }
    },
    onError: (err, value, context) => {
      if (context?.previousValue) {
        utils.viewer.appRoutingForms.calid_forms.setData({}, context.previousValue);
      }
      triggerToast(err.message || t("something_went_wrong"), "error");
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
            selectTeamDialogState,
            setSelectTeamDialogState,
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
          selectTeamDialogState={selectTeamDialogState}
          setSelectTeamDialogState={setSelectTeamDialogState}
        />
      </EmbedDialogProvider>
    </>
  );
}

type FormActionType =
  | "preview"
  | "incompleteBooking"
  | "edit"
  | "copyLink"
  | "toggle"
  | "_delete"
  | "embed"
  | "duplicate"
  | "download"
  | "copyRedirectUrl"
  | "viewResponses"
  | "create";

const Wrapper = ({ href, target, children }: { href?: string; children: React.ReactNode; target?: string }) =>
  href ? (
    <Link data-testid="link-component" href={href} target={target}>
      {children}
    </Link>
  ) : (
    <>{children}</>
  );

export const FormLinkDisplay = ({ routingFormId }: { routingFormId?: string | null }) => {
  const embedLink = `forms/${routingFormId ?? ""}`;

  const orgBranding = useOrgBranding();
  const formLink = `${orgBranding?.fullDomain ?? WEBSITE_URL}/${embedLink}`;

  return <div className="truncate">{formLink}</div>;
};

type FormActionProps<T> = {
  routingForm: RoutingForm | null;
  target?: string;
  href?: string;
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
    ButtonProps & {
      href?: string;
      target?: string;
      icon?: IconName;
      as?: React.ElementType;
      render?: FormActionProps<unknown>["render"];
    }
  > = {
    preview: {
      href: formLink,
      target: "_blank",
    },
    copyLink: {
      size: "sm",
      icon: "link",
      onClick: () => {
        const publicFormLink = `${orgBranding?.fullDomain ?? WEBSITE_URL}/forms/${routingForm?.id}`;
        navigator.clipboard.writeText(publicFormLink);
      },
    },
    duplicate: {
      onClick: () => setNewFormDialogState?.({ action: "duplicate", target: routingForm?.id ?? null }),
      icon: "copy",
      size: "sm",
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
      variant: "button",
      color: "minimal",
      size: "sm",
      icon: "pencil-line",
    },
    incompleteBooking: {
      href: `${appUrl}/incomplete-booking/${routingForm?.id}`,
      size: "sm",
      icon: "calendar",
    },
    download: {
      href: `/api/integrations/routing-forms/responses/${routingForm?.id}`,
      target: "_blank",
      variant: "button",
      color: "minimal",
      size: "sm",
      icon: "download",
    },
    _delete: {
      onClick: () => _delete.onAction({ routingForm }),
      loading: _delete.isPending,
      variant: "button",
      color: "minimal",
      size: "sm",
      icon: "trash-2",
    },
    create: {
      onClick: () => setNewFormDialogState?.({ action: "new", target: "" }),
    },
    viewResponses: {
      size: "sm",
      icon: "eye",
      href: `/insights/routing${
        routingForm?.id
          ? dataTableQueryParamsSerializer({
              activeFilters: [
                { f: "formId", v: { type: ColumnFilterType.SINGLE_SELECT, data: routingForm.id } },
              ],
            })
          : ""
      }`,
    },
    copyRedirectUrl: {
      onClick: () => {
        navigator.clipboard.writeText(redirectUrl);
        triggerToast(t("typeform_redirect_url_copied"), "success");
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
              "sm:hover:bg-subtle self-center rounded-md p-0 transition hover:bg-gray-200",
              extraClassNames
            )}>
            <Switch
              data-testid="toggle-form-switch"
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

  const { as: asFromAction, icon, target, href, ...action } = actionData[actionName];
  const iconName = icon as IconName;
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
      <Wrapper href={href} target={target}>
        <Component data-testid={`form-action-${actionName}`} ref={forwardedRef} {...actionProps}>
          {props.icon && <Icon name={icon} className="h-4 w-4" />}
          {children}
        </Component>
      </Wrapper>
    );
  }
  return (
    <DropdownMenuItem>
      <Wrapper href={href} target={target}>
        <Component
          ref={forwardedRef}
          {...actionProps}
          variant="minimal"
          className={classNames(
            props.className,
            "w-full justify-start transition-none",
            props.color === "destructive" && "border-0"
          )}
          color="minimal">
          <Icon name={iconName} className="h-4 w-4" />
          {children}
        </Component>
      </Wrapper>
    </DropdownMenuItem>
  );
});
