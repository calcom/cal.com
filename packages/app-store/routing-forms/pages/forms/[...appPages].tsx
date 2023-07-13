// TODO: i18n
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import useApp from "@calcom/lib/hooks/useApp";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type {
  AppGetServerSidePropsContext,
  AppPrisma,
  AppSsrInit,
  AppUser,
} from "@calcom/types/AppGetServerSideProps";
import { Badge, ButtonGroup, EmptyScreen, List, ListLinkItem, Tooltip, Button } from "@calcom/ui";
import { CreateButtonWithTeamsList } from "@calcom/ui";
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
import type { RoutingFormWithResponseCount } from "../../components/SingleForm";
import { isFallbackRoute } from "../../lib/isFallbackRoute";

function NewFormButton() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <CreateButtonWithTeamsList
      subtitle={t("create_routing_form_on").toUpperCase()}
      data-testid="new-routing-form"
      createFunction={(teamId) => {
        createAction({ router, teamId: teamId ?? null });
      }}
    />
  );
}

export default function RoutingForms({
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const router = useRouter();

  const hookForm = useFormContext<RoutingFormWithResponseCount>();
  useEffect(() => {
    hookForm.reset({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filters = getTeamsFiltersFromQuery(router.query);

  const queryRes = trpc.viewer.appRoutingForms.forms.useQuery({
    filters,
  });

  const { data: typeformApp } = useApp("typeform");
  const forms = queryRes.data?.filtered;
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

  return (
    <ShellMain
      heading="Routing Forms"
      CTA={hasPaidPlan && forms?.length ? <NewFormButton /> : null}
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
              <div className="flex">
                <TeamsFilter />
              </div>
              <FilterResults
                queryRes={queryRes}
                emptyScreen={
                  <EmptyScreen
                    Icon={GitMerge}
                    headline={t("create_your_first_form")}
                    description={t("create_your_first_form_description")}
                    buttonRaw={<NewFormButton />}
                  />
                }
                noResultsScreen={
                  <EmptyScreen
                    Icon={GitMerge}
                    headline={t("no_results_for_filter")}
                    description={t("change_filter_common")}
                  />
                }
                SkeletonLoader={SkeletonLoaderTeamList}>
                <div className="bg-default mb-16 overflow-hidden">
                  <List data-testid="routing-forms-list">
                    {forms?.map(({ form, readOnly }) => {
                      if (!form) {
                        return null;
                      }

                      const description = form.description || "";
                      form.routes = form.routes || [];
                      const fields = form.fields || [];
                      const userRoutes = form.routes.filter((route) => !isFallbackRoute(route));
                      return (
                        <ListLinkItem
                          key={form.id}
                          href={appUrl + "/form-edit/" + form.id}
                          heading={form.name}
                          disabled={readOnly}
                          subHeading={description}
                          className="space-x-2 rtl:space-x-reverse"
                          actions={
                            <>
                              {form.team?.name && (
                                <div className="border-r-2 border-neutral-300">
                                  <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
                                    {form.team.name}
                                  </Badge>
                                </div>
                              )}
                              <FormAction
                                disabled={readOnly}
                                className="self-center"
                                action="toggle"
                                routingForm={form}
                              />
                              <ButtonGroup combined>
                                <Tooltip content={t("preview")}>
                                  <FormAction
                                    action="preview"
                                    routingForm={form}
                                    target="_blank"
                                    StartIcon={ExternalLink}
                                    color="secondary"
                                    variant="icon"
                                  />
                                </Tooltip>
                                <FormAction
                                  routingForm={form}
                                  action="copyLink"
                                  color="secondary"
                                  variant="icon"
                                  StartIcon={LinkIcon}
                                  tooltip={t("copy_link_to_form")}
                                />
                                <FormAction
                                  routingForm={form}
                                  action="embed"
                                  color="secondary"
                                  variant="icon"
                                  StartIcon={Code}
                                  tooltip={t("embed")}
                                />
                                <FormActionsDropdown disabled={readOnly}>
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
                            </>
                          }>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="gray" startIcon={Menu}>
                              {fields.length} {fields.length === 1 ? "field" : "fields"}
                            </Badge>
                            <Badge variant="gray" startIcon={GitMerge}>
                              {userRoutes.length} {userRoutes.length === 1 ? "route" : "routes"}
                            </Badge>
                            <Badge variant="gray" startIcon={MessageCircle}>
                              {form._count.responses} {form._count.responses === 1 ? "response" : "responses"}
                            </Badge>
                          </div>
                        </ListLinkItem>
                      );
                    })}
                  </List>
                </div>
              </FilterResults>
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
  user: AppUser,
  ssrInit: AppSsrInit
) {
  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const ssr = await ssrInit(context);

  const filters = getTeamsFiltersFromQuery(context.query);

  await ssr.viewer.appRoutingForms.forms.prefetch({
    filters,
  });
  // Prefetch this so that New Button is immediately available
  await ssr.viewer.teamsAndUserProfilesQuery.prefetch();
  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
