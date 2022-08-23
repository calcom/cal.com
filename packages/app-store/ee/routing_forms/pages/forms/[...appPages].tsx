// TODO: i18n
import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import { Icon } from "@calcom/ui/Icon";
import { DropdownMenuSeparator } from "@calcom/ui/v2";
import { EmptyScreen } from "@calcom/ui/v2";
import { Badge } from "@calcom/ui/v2";
import { List, ListItem } from "@calcom/ui/v2/core/List";
import Shell from "@calcom/ui/v2/core/Shell";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import { FormAction, FormActionsDropdown, FormActionsProvider } from "../../components/FormActions";
import { getSerializableForm } from "../../lib/getSerializableForm";

export default function RoutingForms({
  forms,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess: (_data, variables) => {
      router.replace(router.asPath);
    },
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
  });

  function NewFormButton() {
    return <FormAction data-testid="new-routing-form" action="create" />;
  }

  return (
    <FormActionsProvider appUrl={appUrl}>
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
                        actions={
                          <>
                            <FormAction
                              className="self-center border-r-2 border-gray-300 pr-5 "
                              action="toggle"
                              form={form}
                            />
                            <FormAction
                              action="preview"
                              className="ml-3"
                              form={form}
                              target="_blank"
                              StartIcon={Icon.FiExternalLink}
                              color="minimal"
                              size="icon"
                              disabled={disabled}
                            />
                            <FormAction
                              form={form}
                              action="copyLink"
                              color="minimal"
                              size="icon"
                              StartIcon={Icon.FiLink}
                              label={t("copy_link")}
                              disabled={disabled}
                            />
                            <FormActionsDropdown form={form}>
                              <FormAction action="edit" form={form} color="minimal" StartIcon={Icon.FiEdit}>
                                {t("edit")}
                              </FormAction>
                              <FormAction
                                action="download"
                                form={form}
                                color="minimal"
                                StartIcon={Icon.FiDownload}>
                                Download Responses
                              </FormAction>
                              <FormAction action="embed" form={form} color="minimal" StartIcon={Icon.FiCode}>
                                {t("embed")}
                              </FormAction>
                              <FormAction
                                action="duplicate"
                                form={form}
                                color="minimal"
                                StartIcon={Icon.FiCopy}>
                                {t("duplicate")}
                              </FormAction>
                              <DropdownMenuSeparator className="h-px bg-gray-200" />
                              <FormAction
                                action="_delete"
                                form={form}
                                color="destructive"
                                className="w-full"
                                StartIcon={Icon.FiTrash}>
                                {t("delete")}
                              </FormAction>
                            </FormActionsDropdown>
                          </>
                        }>
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
              </div>
            ) : null}
          </div>
        </div>
      </Shell>
    </FormActionsProvider>
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
