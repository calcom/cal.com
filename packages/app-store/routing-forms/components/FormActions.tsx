import { /* Switch, */ Button, Input, Textarea } from "@calid/features/ui";
import type { ButtonProps } from "@calid/features/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose, // ConfirmationDialogContent,
} from "@calid/features/ui";
import { configDotenv } from "dotenv";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, createContext, forwardRef, useContext, useState } from "react";
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
// import type { ButtonProps } from "@calcom/ui/components/button";
import { Button as ButtonCalcom } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { TextAreaField } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import { TeamSelectionDialog } from "./TeamsSelectionDialog.tsx";

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
            className="text-emphasis !font-cal text-semibold leading-20 text-base font-medium"
            id="modal-title">
            {teamId ? t("add_new_team_form") : t("add_new_form")}
          </h3>
          <div>
            <p className="text-subtle text-xs">{t("form_description")}</p>
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
              <Textarea
                id="description"
                {...register("description")}
                data-testid="description"
                placeholder={t("form_description_placeholder")}
              />
            </div>
            {/* Disable this feature for new forms till we get it fully working with Routing Form with Attributes. This isn't much used feature */}
            {/* {action === "duplicate" && (
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
            )} */}
          </div>
          <DialogFooter className="mt-12">
            <DialogClose />
            <Button loading={mutation.isPending} data-testid="add-form" type="submit" variant="default">
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
            size="sm"
            color="secondary"
            className={classNames(disabled && "opacity-30")}>
            <Icon name="ellipsis" className="h-3 w-3" />
          </Button>
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

  useEffect(() => {
    console.log("Select state: ", selectTeamDialogState);
  });
  return (
    <div id="form-dialogs">
      <RoutingFormEmbedDialog />
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {/* <ConfirmationDialogContent
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
        </ConfirmationDialogContent> */}
      </Dialog>

      {/* <TeamSelectionDialog
        open={selectTeamDialogState !== null}
        openChange={(open: boolean) => !open && setSelectTeamDialogState(null)}
        onTeamSelect={(teamId: string) => {
          setSelectTeamDialogState(null);
          setNewFormDialogState({ action: "new", target: teamId });
        }}
      /> */}

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

  return <div>{formLink}</div>;
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
      icon?: string;
      as?: React.ElementType;
      render?: FormActionProps<unknown>["render"];
    }
  > = {
    preview: {
      href: formLink,
      target: "_blank",
    },
    copyLink: {
      onClick: () => {
        showToast(t("link_copied"), "success");
        navigator.clipboard.writeText(formLink);
      },
    },
    duplicate: {
      onClick: () => setNewFormDialogState?.({ action: "duplicate", target: routingForm?.id ?? null }),
      variant: "ghost",
      icon: "copy",
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
      variant: "ghost",
      icon: "pencil",
    },
    incompleteBooking: {
      href: `${appUrl}/incomplete-booking/${routingForm?.id}`,
    },
    download: {
      href: `/api/integrations/routing-forms/responses/${routingForm?.id}`,
      target: "_blank",
      variant: "ghost",
      icon: "download",
    },
    _delete: {
      onClick: () => _delete.onAction({ routingForm }),
      loading: _delete.isPending,
      variant: "ghost",
      icon: "trash",
    },
    create: {
      onClick: () => setNewFormDialogState?.({ action: "new", target: "" }),
    },
    viewResponses: {
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
              "sm:hover:bg-subtle self-center rounded-md p-0 transition hover:bg-gray-200",
              extraClassNames
            )}>
            <Switch
              data-testid="toggle-form-switch"
              size="sm"
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
  // for (const key in actionProps) {

  if (!dropdown) {
    return (
      <Wrapper href={href} target={target}>
        <Component data-testid={`form-action-${actionName}`} ref={forwardedRef} {...actionProps}>
          {children}
        </Component>
      </Wrapper>
    );
  }
  return (
    <DropdownMenuItem className="hover:bg-[initial]">
      <Wrapper href={href} target={target}>
        <Component
          ref={forwardedRef}
          {...actionProps}
          className={classNames(
            props.className,
            "text-cal-destructive w-full p-2 transition-none",
            props.color === "destructive" && "border-0"
          )}>
          {icon && <Icon name={icon} className="h-4 w-4" />}
          {children}
        </Component>
      </Wrapper>
    </DropdownMenuItem>
  );
});
