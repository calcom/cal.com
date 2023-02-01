// TODO: i18n
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import useApp from "@calcom/lib/hooks/useApp";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import {
  Badge,
  ButtonGroup,
  DropdownMenuSeparator,
  EmptyScreen,
  List,
  ListLinkItem,
  Tooltip,
  Button,
} from "@calcom/ui";
import {
  FiPlus,
  FiGitMerge,
  FiExternalLink,
  FiLink,
  FiEdit,
  FiDownload,
  FiCode,
  FiCopy,
  FiTrash,
  FiMenu,
  FiMessageCircle,
  FiFileText,
  FiShuffle,
  FiBarChart,
  FiCheckCircle,
  FiMail,
} from "@calcom/ui/components/icon";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import { FormAction, FormActionsDropdown, FormActionsProvider } from "../../components/FormActions";
import { getSerializableForm } from "../../lib/getSerializableForm";

export default function RoutingForms({
  forms: forms_,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();

  const { data: forms, isLoading } = trpc.viewer.appRoutingForms.forms.useQuery(undefined, {
    initialData: forms_,
  });

  const { data: typeformApp } = useApp("typeform");

  const features = [
    {
      icon: <FiFileText className="h-5 w-5 text-orange-500" />,
      title: t("create_your_first_form"),
      description: t("create_your_first_form_description"),
    },
    {
      icon: <FiShuffle className="h-5 w-5 text-lime-500" />,
      title: t("create_your_first_route"),
      description: t("route_to_the_right_person"),
    },
    {
      icon: <FiBarChart className="h-5 w-5 text-blue-500" />,
      title: t("reporting"),
      description: t("reporting_feature"),
    },
    {
      icon: <FiCheckCircle className="h-5 w-5 text-teal-500" />,
      title: t("test_routing_form"),
      description: t("test_preview_description"),
    },
    {
      icon: <FiMail className="h-5 w-5 text-yellow-500" />,
      title: t("routing_forms_send_email_owner"),
      description: t("routing_forms_send_email_owner_description"),
    },
    {
      icon: <FiDownload className="h-5 w-5 text-violet-500" />,
      title: t("download_responses"),
      description: t("download_responses_description"),
    },
  ];

  function NewFormButton() {
    return (
      <FormAction
        variant="fab"
        routingForm={null}
        data-testid="new-routing-form"
        StartIcon={FiPlus}
        action="create">
        {t("new")}
      </FormAction>
    );
  }
  return (
    <ShellMain
      heading="Routing Forms"
      CTA={hasPaidPlan && <NewFormButton />}
      subtitle={t("routing_forms_description")}>
      <UpgradeTip
        dark
        title={t("teams_plan_required")}
        description={t("routing_forms_are_a_great_way")}
        features={features}
        background="/routing-form-banner-background.jpg"
        isParentLoading={isLoading && <SkeletonLoaderTeamList />}
        buttons={
          <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
            <ButtonGroup>
              <Button color="secondary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("upgrade")}
              </Button>
              <Button
                color="minimal"
                className="!bg-transparent text-white opacity-50 hover:opacity-100"
                href="https://go.cal.com/teams-video"
                target="_blank">
                {t("learn_more")}
              </Button>
            </ButtonGroup>
          </div>
        }>
        <FormActionsProvider appUrl={appUrl}>
          <div className="-mx-4 md:-mx-8">
            <div className="mb-10 w-full px-4 pb-2 sm:px-6 md:px-8">
              {!forms?.length ? (
                <EmptyScreen
                  Icon={FiGitMerge}
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
                                    StartIcon={FiExternalLink}
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
                                  StartIcon={FiLink}
                                  disabled={disabled}
                                  tooltip={t("copy_link_to_form")}
                                />
                                <FormActionsDropdown form={form}>
                                  <FormAction
                                    action="edit"
                                    routingForm={form}
                                    color="minimal"
                                    className="!flex"
                                    StartIcon={FiEdit}>
                                    {t("edit")}
                                  </FormAction>
                                  <FormAction
                                    action="download"
                                    routingForm={form}
                                    color="minimal"
                                    StartIcon={FiDownload}>
                                    {t("download_responses")}
                                  </FormAction>
                                  <FormAction
                                    action="embed"
                                    routingForm={form}
                                    color="minimal"
                                    className="w-full"
                                    StartIcon={FiCode}>
                                    {t("embed")}
                                  </FormAction>
                                  <FormAction
                                    action="duplicate"
                                    routingForm={form}
                                    color="minimal"
                                    className="w-full"
                                    StartIcon={FiCopy}>
                                    {t("duplicate")}
                                  </FormAction>
                                  {typeformApp?.isInstalled ? (
                                    <FormAction
                                      data-testid="copy-redirect-url"
                                      routingForm={form}
                                      action="copyRedirectUrl"
                                      color="minimal"
                                      type="button"
                                      StartIcon={FiLink}>
                                      {t("Copy Typeform Redirect Url")}
                                    </FormAction>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <FormAction
                                    action="_delete"
                                    routingForm={form}
                                    color="destructive"
                                    className="w-full"
                                    StartIcon={FiTrash}>
                                    {t("delete")}
                                  </FormAction>
                                </FormActionsDropdown>
                              </ButtonGroup>
                            </>
                          }>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="gray" StartIcon={FiMenu}>
                              {fields.length} {fields.length === 1 ? "field" : "fields"}
                            </Badge>
                            <Badge variant="gray" StartIcon={FiGitMerge}>
                              {form.routes.length} {form.routes.length === 1 ? "route" : "routes"}
                            </Badge>
                            <Badge variant="gray" StartIcon={FiMessageCircle}>
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
      </UpgradeTip>
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
