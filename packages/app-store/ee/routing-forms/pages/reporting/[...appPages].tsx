import { useAutoAnimate } from "@formkit/auto-animate/react";
import { App_RoutingForms_Form } from "@prisma/client";
import React, { useRef, useState, useCallback } from "react";
import { Query, Config, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonTree, ImmutableTree, BuilderProps } from "react-awesome-query-builder";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  AppGetServerSidePropsContext,
  AppPrisma,
  AppUser,
  AppSsrInit,
} from "@calcom/types/AppGetServerSideProps";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui";
import { SelectWithValidation as Select, TextArea, Shell } from "@calcom/ui/v2";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import SingleForm from "../../components/SingleForm";
import QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { getQueryBuilderConfig } from "../route-builder/[...appPages]";

const hasRules = (route: Route) =>
  route.queryValue.children1 && Object.keys(route.queryValue.children1).length;
type QueryBuilderUpdatedConfig = typeof QueryBuilderInitialConfig & { fields: Config["fields"] };

const getEmptyRoute = (): SerializableRoute => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    action: {
      type: "eventTypeRedirectUrl",
      value: "",
    },
    queryValue: { id: uuid, type: "group" },
  };
};

const createFallbackRoute = (): SerializableRoute => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    isFallback: true,
    action: {
      type: "customPageMessage",
      value: "Thank you for your interest! We will be in touch soon.",
    },
    queryValue: { id: uuid, type: "group" },
  };
};

type Route = {
  id: string;
  isFallback?: boolean;
  action: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  };
  // This is what's persisted
  queryValue: JsonTree;
  // `queryValue` is parsed to create state
  state: {
    tree: ImmutableTree;
    config: QueryBuilderUpdatedConfig;
  };
};

type SerializableRoute = Pick<Route, "id" | "action"> & {
  queryValue: Route["queryValue"];
  isFallback?: Route["isFallback"];
};

const Result = ({ formId, jsonLogicQuery }) => {
  const { t } = useLocale();

  const { isLoading, status, data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.useInfiniteQuery(
      [
        "viewer.app_routing_forms.report",
        {
          formId: formId,
          jsonLogicQuery,
        },
      ],
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );
  const buttonInView = useInViewObserver(() => {
    if (hasNextPage) {
      fetchNextPage();
    }
  });

  const headers = useRef(null);

  if (!isLoading && !data) {
    return <div>Error loading report</div>;
  }
  headers.current = (data?.pages && data?.pages[0]?.headers) || headers.current;
  return (
    <>
      <table className="w-full table-auto border border-gray-300">
        <tr className="bg-gray-300">
          {headers.current?.map((header, index) => (
            <th className="py-3 text-left text-base font-medium first:pl-2" key={index}>
              {header}
            </th>
          ))}
        </tr>
        {isLoading ? <div>Report is loading</div> : ""}
        {!isLoading &&
          data?.pages.map((page) => {
            return page.responses?.map((responses, index) => {
              return (
                <tr
                  key={index}
                  className={classNames(" text-center text-sm", index % 2 ? "bg-gray-100" : "")}>
                  {responses.map((r, index) => (
                    <td className="py-3 text-left first:pl-2" key={index}>
                      {r}
                    </td>
                  ))}
                </tr>
              );
            });
          })}
      </table>
      <Button
        type="button"
        color="minimal"
        ref={buttonInView.ref}
        loading={isFetchingNextPage}
        disabled={!hasNextPage}
        onClick={() => fetchNextPage()}>
        {hasNextPage ? t("load_more_results") : t("no_more_results")}
      </Button>
    </>
  );
};

const ReporterRow = ({
  formId,
  config,
  reporterRow,
}: {
  formId: string;
  reporterRow: any;
  config: QueryBuilderUpdatedConfig;
}) => {
  // const { data: eventTypesByGroup } = trpc.useQuery(["viewer.eventTypes"]);

  // const eventOptions: { label: string; value: string }[] = [];
  // eventTypesByGroup?.eventTypeGroups.forEach((group) => {
  //   group.eventTypes.forEach((eventType) => {
  //     const uniqueSlug = `${group.profile.slug}/${eventType.slug}`;
  //     eventOptions.push({
  //       label: uniqueSlug,
  //       value: uniqueSlug,
  //     });
  //   });
  // });
  const [reporterRowQuery, setReporterRowQuery] = useState(reporterRow);
  const [jsonLogicQuery, setJsonLogicQuery] = useState();
  const onChange = (immutableTree: ImmutableTree, config: QueryBuilderUpdatedConfig) => {
    const jsonTree = QbUtils.getTree(immutableTree);
    setReporterRowQuery(() => {
      const newValue = {
        state: { tree: immutableTree, config: config },
        queryValue: jsonTree,
      };
      setJsonLogicQuery(QbUtils.jsonLogicFormat(newValue.state.tree, config));
      return newValue;
    });
  };

  const renderBuilder = useCallback(
    (props: BuilderProps) => (
      <div className="query-builder-container">
        <div className="query-builder qb-lite">
          <Builder {...props} />
        </div>
      </div>
    ),
    []
  );

  return (
    <>
      <Query
        {...config}
        value={reporterRowQuery.state.tree}
        onChange={(immutableTree, config) => {
          onChange(immutableTree, config as QueryBuilderUpdatedConfig);
        }}
        renderBuilder={renderBuilder}
      />
      <hr className="mt-6" />
      <Result formId={formId} jsonLogicQuery={jsonLogicQuery} />
    </>
  );
};

const getInitialReporterRow = (config) => {
  const uuid = QbUtils.uuid();
  const queryValue = { id: uuid, type: "group" };
  const tree = QbUtils.checkTree(QbUtils.loadTree(queryValue), config);
  return {
    state: { tree, config },
    queryValue,
  };
};
const Reporter = ({
  form,
}: {
  form: inferSSRProps<typeof getServerSideProps>["form"];
  // Figure out the type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hookForm: any;
}) => {
  const config = getQueryBuilderConfig(form, true);

  return (
    <div className="flex flex-col-reverse md:flex-row">
      <div className="cal-query-builder w-full ltr:mr-2 rtl:ml-2">
        <ReporterRow formId={form.id} reporterRow={getInitialReporterRow(config)} config={config} />
      </div>
    </div>
  );
};

export default function ReporterWrapper({
  form,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      Page={({ hookForm, form }) => (
        <div className="route-config">
          <Reporter form={form} />
        </div>
      )}
    />
  );
}

ReporterWrapper.getLayout = (page: React.ReactElement) => {
  return (
    <Shell backPath="/apps/routing-forms/forms" withoutMain={true}>
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
  const ssr = await ssrInit(context);

  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 1) {
    return {
      notFound: true,
    };
  }

  const isAllowed = (await import("../../lib/isAllowed")).isAllowed;
  if (!(await isAllowed({ userId: user.id, formId }))) {
    return {
      notFound: true,
    };
  }

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });
  if (!form) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      trpcState: ssr.dehydrate(),
      form: getSerializableForm(form),
    },
  };
};
