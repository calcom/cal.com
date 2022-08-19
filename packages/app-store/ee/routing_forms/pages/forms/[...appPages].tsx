// TODO: i18n
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import classNames from "@calcom/lib/classNames";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Dialog, DialogClose, DialogContent } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import { Form, TextField } from "@calcom/ui/form/fields";
import { Button, EmptyScreen, Switch, Tooltip } from "@calcom/ui/v2";
import { Badge } from "@calcom/ui/v2";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";
import { List, ListItem } from "@calcom/ui/v2/core/List";
import Shell from "@calcom/ui/v2/core/Shell";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import { EmbedButton, EmbedDialog } from "@components/Embed";

import { getSerializableForm } from "../../lib/getSerializableForm";

const newFormModalQuerySchema = z.object({
  action: z.string(),
  target: z.string().optional(),
});

function NewFormDialog({ appUrl }: { appUrl: string }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();

  const hookForm = useForm<{
    name: string;
    description: string;
  }>();

  const { action, target } = router.query as z.infer<typeof newFormModalQuerySchema>;
  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess: (_data, variables) => {
      utils.invalidateQueries("viewer.app_routing_forms.forms");
      router.push(`${appUrl}/form-edit/${variables.id}`);
    },
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
  });
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
            <Button data-testid="add-form" type="submit">
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

export default function RoutingForms({
  forms,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const router = useRouter();

  const openModal = (option: { target?: string; action: string }) => {
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

  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess: (_data, variables) => {
      router.replace(router.asPath);
    },
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
  });

  const deleteMutation = trpc.useMutation("viewer.app_routing_forms.deleteForm", {
    onSuccess: () => {
      showToast("Form deleted", "success");
      setDeleteDialogOpen(false);
      router.replace(router.asPath);
    },
    onSettled: () => {
      utils.invalidateQueries(["viewer.app_routing_forms.forms"]);
      setDeleteDialogOpen(false);
    },
    onError: () => {
      showToast("Something went wrong", "error");
    },
  });
  const utils = trpc.useContext();
  const { t } = useLocale();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogFormId, setDeleteDialogFormId] = useState<string | null>(null);

  function NewFormButton() {
    return (
      <Button
        onClick={() => openModal({ action: "new" })}
        data-testid="new-routing-form"
        StartIcon={Icon.FiPlus}>
        New Form
      </Button>
    );
  }

  return (
    <Shell
      heading="Routing Forms"
      CTA={<NewFormButton />}
      subtitle="You can see all routing forms and create one here.">
      <div className="-mx-4 md:-mx-8">
        <div className="mb-10 w-full px-4 pb-2 sm:px-6 md:px-8">
          {!forms.length ? (
            <EmptyScreen
              Icon={Icon.FiGitMerge}
              headline="Create your first form"
              description="Forms enable you to allow a booker to connect with the right person or choose the right event, faster. It would work by taking inputs from the booker and using that data to route to the correct booker/event as configured by Cal user"
              button={<NewFormButton />}
            />
          ) : null}
          {forms.length ? (
            <div className="-mx-4 mb-16 overflow-hidden bg-white sm:mx-0">
              <List data-testid="routing-forms-list">
                {forms.map((form, index) => {
                  if (!form) {
                    return null;
                  }
                  const embedLink = `forms/${form.id}`;
                  const formLink = `${CAL_URL}/${embedLink}`;
                  const description = form.description || "";
                  const disabled = form.disabled;
                  form.routes = form.routes || [];
                  const fields = form.fields || [];
                  return (
                    <ListItem
                      key={index}
                      href={appUrl + "/form-edit/" + form.id}
                      onToggle={(isChecked) => {
                        mutation.mutate({
                          ...form,
                          disabled: !isChecked,
                        });
                      }}
                      heading={form.name}
                      disabled={disabled}
                      subHeading={description}
                      actions={[
                        {
                          externalLink: formLink,
                          label: t("preview"),
                          visibleOutsideDropdown: true,
                        },
                        {
                          label: t("copy_link"),
                          icon: Icon.FiLink,
                          visibleOutsideDropdown: true,
                          onClick: () => {
                            showToast(t("link_copied"), "success");
                            navigator.clipboard.writeText(formLink);
                          },
                        },
                        {
                          label: t("edit"),
                          icon: Icon.FiEdit2,
                          link: appUrl + "/form-edit/" + form.id,
                        },
                        {
                          label: "Download Responses",
                          icon: Icon.FiDownload,
                          link: "/api/integrations/routing_forms/responses/" + form.id,
                        },
                        {
                          label: t("embed"),
                          icon: Icon.FiCode,
                          as: EmbedButton,
                          props: {
                            embedUrl: encodeURIComponent(embedLink),
                          },
                        },
                        {
                          label: t("duplicate"),
                          "data-testid": "routing-form-duplicate-" + form.id,
                          icon: Icon.FiCopy,
                          onClick: () => openModal({ action: "duplicate", target: form.id }),
                        },
                        {
                          separator: true,
                        },
                        {
                          label: t("delete"),
                          icon: Icon.FiTrash,
                          props: {
                            color: "destructive",
                          },
                          onClick: () => {
                            setDeleteDialogOpen(true);
                            setDeleteDialogFormId(form.id);
                          },
                        },
                      ]}>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="gray" StartIcon={Icon.FiMenu}>
                          {fields.length} {fields.length === 1 ? "field" : "fields"}
                        </Badge>
                        <Badge variant="gray" StartIcon={Icon.FiGitMerge}>
                          {form.routes.length} {form.routes.length === 1 ? "route" : "routes"}
                        </Badge>
                        <Badge variant="gray" StartIcon={Icon.FiMessageCircle}>
                          {form._count.responses} {form._count.responses === 1 ? "response" : "responses"}
                        </Badge>
                      </div>
                    </ListItem>
                  );
                })}
              </List>
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
                  Are you sure you want to delete this form? Anyone who you&apos;ve shared the link with will
                  no longer be able to book using it. Also, all associated responses would be deleted.
                </ConfirmationDialogContent>
              </Dialog>
            </div>
          ) : null}
          <NewFormDialog appUrl={appUrl} />
        </div>
      </div>
    </Shell>
  );
}

export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser
) {
  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const forms = await prisma.app_RoutingForms_Form.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  const serializableForms = forms.map((form) => getSerializableForm(form));

  return {
    props: {
      forms: serializableForms,
    },
  };
};
