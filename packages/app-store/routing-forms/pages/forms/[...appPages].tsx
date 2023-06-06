// TODO: i18n
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import useApp from "@calcom/lib/hooks/useApp";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import { Badge, ButtonGroup, EmptyScreen, List, ListLinkItem, Tooltip, Button } from "@calcom/ui";
import { CreateButton } from "@calcom/ui";
import {
  GitMerge,
  ExternalLink,
  Link as LinkIcon,
  Edit,
  Download,
  Code,
  Copy,
  Trash,
  Menu,
  MessageCircle,
  FileText,
  Shuffle,
  BarChart,
  CheckCircle,
  Mail,
} from "@calcom/ui/components/icon";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import {
  createAction,
  FormAction,
  FormActionsDropdown,
  FormActionsProvider,
} from "../../components/FormActions";
import { filterQuerySchema, TeamsFilter, useFilterQuery } from "../../components/TeamsFilter";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { hasWriteAccessToForm, getPrismaWhereFromFilters } from "../../trpc/forms.handler";

export default function RoutingForms({
  forms: forms_,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const { data: query } = useFilterQuery();

  const { data: forms, isLoading } = trpc.viewer.appRoutingForms.forms.useQuery(
    {
      filters: query,
    },
    {
      initialData: forms_,
    }
  );

  const { data: typeformApp } = useApp("typeform");

  const features = [
    {
      icon: <FileText className="h-5 w-5 text-orange-500" />,
      title: t("create_your_first_form"),
      description: t("create_your_first_form_description"),
    },
    {
      icon: <Shuffle className="h-5 w-5 text-lime-500" />,
      title: t("create_your_first_route"),
      description: t("route_to_the_right_person"),
    },
    {
      icon: <BarChart className="h-5 w-5 text-blue-500" />,
      title: t("reporting"),
      description: t("reporting_feature"),
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-teal-500" />,
      title: t("test_routing_form"),
      description: t("test_preview_description"),
    },
    {
      icon: <Mail className="h-5 w-5 text-yellow-500" />,
      title: t("routing_forms_send_email_owner"),
      description: t("routing_forms_send_email_owner_description"),
    },
    {
      icon: <Download className="h-5 w-5 text-violet-500" />,
      title: t("download_responses"),
      description: t("download_responses_description"),
    },
  ];

  function NewFormButton() {
    const query = trpc.viewer.eventTypes.getByViewer.useQuery();
    const router = useRouter();
    if (!query.data) return null;

    const profileOptions = query.data.profiles
      .filter((profile) => !profile.readOnly)
      .map((profile) => {
        return {
          teamId: profile.teamId,
          label: profile.name || profile.slug,
          image: profile.image,
          membershipRole: profile.membershipRole,
          slug: profile.slug,
        };
      });

    return (
      <CreateButton
        subtitle={t("create_routing_form_on").toUpperCase()}
        createFunction={(teamId) => {
          createAction({ router, teamId: teamId ?? null });
        }}
        options={profileOptions}
      />
    );
  }
  return (
    <ShellMain
      heading="Routing Forms"
      CTA={hasPaidPlan && <NewFormButton />}
      subtitle={t("routing_forms_description")}>
      <UpgradeTip
        title={t("teams_plan_required")}
        description={t("routing_forms_are_a_great_way")}
        features={features}
        background="/tips/routing-forms"
        isParentLoading={<SkeletonLoaderTeamList />}
        buttons={
          <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
            <ButtonGroup>
              <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("upgrade")}
              </Button>
              <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
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
                  Icon={GitMerge}
                  headline={t("create_your_first_form")}
                  description={t("create_your_first_form_description")}
                  buttonRaw={<NewFormButton />}
                />
              ) : null}
              {forms?.length ? (
                <div>
                  <TeamsFilter />
                  <div className="bg-default mb-16 overflow-hidden">
                    <List data-testid="routing-forms-list">
                      {forms.map(({ form, readOnly }, index) => {
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
                            className="space-x-2 rtl:space-x-reverse"
                            actions={
                              <>
                                <FormAction className="self-center" action="toggle" routingForm={form} />
                                <ButtonGroup combined>
                                  <Tooltip content={t("preview")}>
                                    <FormAction
                                      action="preview"
                                      routingForm={form}
                                      target="_blank"
                                      StartIcon={ExternalLink}
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
                                    StartIcon={LinkIcon}
                                    disabled={disabled}
                                    tooltip={t("copy_link_to_form")}
                                  />
                                  <FormAction
                                    routingForm={form}
                                    action="embed"
                                    color="secondary"
                                    variant="icon"
                                    StartIcon={Code}
                                    disabled={disabled}
                                    tooltip={t("embed")}
                                  />
                                  <FormActionsDropdown form={form}>
                                    <FormAction
                                      action="edit"
                                      routingForm={form}
                                      color="minimal"
                                      className="!flex"
                                      StartIcon={Edit}>
                                      {t("edit")}
                                    </FormAction>
                                    <FormAction
                                      action="download"
                                      routingForm={form}
                                      color="minimal"
                                      StartIcon={Download}>
                                      {t("download_responses")}
                                    </FormAction>
                                    <FormAction
                                      action="duplicate"
                                      routingForm={form}
                                      color="minimal"
                                      className="w-full"
                                      StartIcon={Copy}>
                                      {t("duplicate")}
                                    </FormAction>
                                    {typeformApp?.isInstalled ? (
                                      <FormAction
                                        data-testid="copy-redirect-url"
                                        routingForm={form}
                                        action="copyRedirectUrl"
                                        color="minimal"
                                        type="button"
                                        StartIcon={LinkIcon}>
                                        {t("Copy Typeform Redirect Url")}
                                      </FormAction>
                                    ) : null}
                                    <FormAction
                                      action="_delete"
                                      routingForm={form}
                                      color="destructive"
                                      className="w-full"
                                      StartIcon={Trash}>
                                      {t("delete")}
                                    </FormAction>
                                  </FormActionsDropdown>
                                </ButtonGroup>
                                {readOnly && (
                                  <Badge variant="gray" className="ml-2">
                                    {t("readonly")}
                                  </Badge>
                                )}
                              </>
                            }>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="gray" startIcon={Menu}>
                                {fields.length} {fields.length === 1 ? "field" : "fields"}
                              </Badge>
                              <Badge variant="gray" startIcon={GitMerge}>
                                {form.routes.length} {form.routes.length === 1 ? "route" : "routes"}
                              </Badge>
                              <Badge variant="gray" startIcon={MessageCircle}>
                                {form._count.responses}{" "}
                                {form._count.responses === 1 ? "response" : "responses"}
                              </Badge>
                            </div>
                          </ListLinkItem>
                        );
                      })}
                    </List>
                  </div>
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
  return (
    <Shell withoutMain={true} hideHeadingOnMobile>
      {page}
    </Shell>
  );
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
  const filters = filterQuerySchema.parse(context.query);

  const where = getPrismaWhereFromFilters({ id: user.id }, filters);
  console.log("where", where);
  const forms = await prisma.app_RoutingForms_Form.findMany({
    where,
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
    serializableForms.push({
      form: await getSerializableForm(form),
      readOnly: hasWriteAccessToForm(form, user.id),
    });
  }

  return {
    props: {
      ...(await serverSideTranslations(context.locale ?? "", ["common"])),
      forms: serializableForms,
    },
  };
};
