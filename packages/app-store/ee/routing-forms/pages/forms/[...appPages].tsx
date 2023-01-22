// TODO: i18n
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import {
  Badge,
  ButtonGroup,
  DropdownMenuSeparator,
  EmptyScreen,
  Icon,
  List,
  ListLinkItem,
  Tooltip,
} from "@calcom/ui";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import { FormAction, FormActionsDropdown, FormActionsProvider } from "../../components/FormActions";
import { getSerializableForm } from "../../lib/getSerializableForm";

export default function RoutingForms({
  forms: forms_,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  const { data: forms } = trpc.viewer.appRoutingForms.forms.useQuery(undefined, {
    initialData: forms_,
  });

  const { data: typeformApp } = useApp("typeform");

  function NewFormButton() {
    return (
      <FormAction
        variant="fab"
        routingForm={null}
        data-testid="new-routing-form"
        StartIcon={Icon.FiPlus}
        action="create">
        {t("new")}
      </FormAction>
    );
  }
  return (
    <ShellMain heading="Routing Forms" CTA={<NewFormButton />} subtitle={t("routing_forms_description")}>
      <FormActionsProvider appUrl={appUrl}>
        <div className="-mx-4 md:-mx-8">
          <div className="mb-10 w-full px-4 pb-2 sm:px-6 md:px-8">
            {!forms?.length ? (
              <EmptyScreen
                Icon={Icon.FiGitMerge}
                headline={t("create_your_first_form")}
                description={t("create_your_first_form_description")}
                buttonRaw={<NewFormButton />}
              />
            ) : null}
            {forms?.length ? (
              <div className="mb-16 overflow-hidden bg-white">
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
                      <ListLinkItem
                        key={index}
                        href={appUrl + "/form-edit/" + form.id}
                        heading={form.name}
                        disabled={disabled}
                        subHeading={description}
                        actions={
                          <>
                            <FormAction className="self-center" action="toggle" routingForm={form} />
                            <ButtonGroup combined>
                              <Tooltip content={t("preview")}>
                                <FormAction
                                  action="preview"
                                  routingForm={form}
                                  target="_blank"
                                  StartIcon={Icon.FiExternalLink}
                                  color="secondary"
                                  variant="icon"
                                  disabled={disabled}
                                />
                              </Tooltip>
                              <FormAction
                                routingForm={form}
                                action="copyLink"
                                color="secondary"
                                variant="icon"
                                StartIcon={Icon.FiLink}
                                disabled={disabled}
                                tooltip={t("copy_link_to_form")}
                              />
                              <FormActionsDropdown form={form}>
                                <FormAction
                                  action="edit"
                                  routingForm={form}
                                  color="minimal"
                                  className="!flex"
                                  StartIcon={Icon.FiEdit}>
                                  {t("edit")}
                                </FormAction>
                                <FormAction
                                  action="download"
                                  routingForm={form}
                                  color="minimal"
                                  StartIcon={Icon.FiDownload}>
                                  {t("download_responses")}
                                </FormAction>
                                <FormAction
                                  action="embed"
                                  routingForm={form}
                                  color="minimal"
                                  className="w-full"
                                  StartIcon={Icon.FiCode}>
                                  {t("embed")}
                                </FormAction>
                                <FormAction
                                  action="duplicate"
                                  routingForm={form}
                                  color="minimal"
                                  className="w-full"
                                  StartIcon={Icon.FiCopy}>
                                  {t("duplicate")}
                                </FormAction>
                                {typeformApp?.isInstalled ? (
                                  <FormAction
                                    data-testid="copy-redirect-url"
                                    routingForm={form}
                                    action="copyRedirectUrl"
                                    color="minimal"
                                    type="button"
                                    StartIcon={Icon.FiLink}>
                                    {t("Copy Typeform Redirect Url")}
                                  </FormAction>
                                ) : null}
                                <DropdownMenuSeparator />
                                <FormAction
                                  action="_delete"
                                  routingForm={form}
                                  color="destructive"
                                  className="w-full"
                                  StartIcon={Icon.FiTrash}>
                                  {t("delete")}
                                </FormAction>
                              </FormActionsDropdown>
                            </ButtonGroup>
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
                      </ListLinkItem>
                    );
                  })}
                </List>
              </div>
            ) : null}
          </div>
        </div>
      </FormActionsProvider>
    </ShellMain>
  );
}

RoutingForms.getLayout = (page: React.ReactElement) => {
  return <Shell withoutMain={true}>{page}</Shell>;
};

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

  const serializableForms = [];
  for (const [, form] of Object.entries(forms)) {
    serializableForms.push(await getSerializableForm(form));
  }

  return {
    props: {
      ...(await serverSideTranslations(context.locale ?? "", ["common"])),
      forms: serializableForms,
    },
  };
};
