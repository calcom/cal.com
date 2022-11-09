import React, { useRef, useState, useCallback } from "react";
import { Query, Config, Builder, Utils as QbUtils, JsonLogicResult } from "react-awesome-query-builder";
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
import { Shell } from "@calcom/ui/v2";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import SingleForm from "../../components/SingleForm";
import QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import { JsonLogicQuery } from "../../jsonLogicToPrisma";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { getQueryBuilderConfig } from "../route-builder/[...appPages]";

type QueryBuilderUpdatedConfig = typeof QueryBuilderInitialConfig & { fields: Config["fields"] };

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

const Result = ({ formId, jsonLogicQuery }: { formId: string; jsonLogicQuery: JsonLogicQuery | null }) => {
  const { t } = useLocale();

  const { isLoading, status, data, isFetching, error, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.useInfiniteQuery(
      [
        "viewer.app_routing_forms.report",
        {
          formId: formId,
          jsonLogicQuery: jsonLogicQuery?.logic
            ? jsonLogicQuery
            : {
                logic: {},
              },
        },
      ],
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );
  const buttonInView = useInViewObserver(() => {
    if (!isFetching && hasNextPage && status === "success") {
      fetchNextPage();
    }
  });

  const headers = useRef<string[] | null>(null);

  if (!isLoading && !data) {
    return <div>Error loading report {error?.message} </div>;
  }
  headers.current = (data?.pages && data?.pages[0]?.headers) || headers.current;

  return (
    <div className="w-full max-w-[2000px] overflow-x-scroll">
      <table data-testid="reporting-table" className="table-fixed border border-gray-300">
        <tr data-testid="reporting-header" className="bg-gray-300">
          {headers.current?.map((header, index) => (
            <th className="border border-gray-400 py-3 px-2 text-left text-base font-medium" key={index}>
              {header}
            </th>
          ))}
        </tr>
        {!isLoading &&
          data?.pages.map((page) => {
            return page.responses?.map((responses, index) => {
              return (
                <tr
                  key={index}
                  data-testid="reporting-row"
                  className={classNames(" text-center text-sm", index % 2 ? "bg-gray-100" : "")}>
                  {responses.map((r, index) => (
                    <td className="overflow-x-hidden border border-gray-400 py-3 px-2 text-left" key={index}>
                      {r}
                    </td>
                  ))}
                </tr>
              );
            });
          })}
      </table>
      {isLoading ? <div className="p-2">Report is loading</div> : ""}
      <Button
        type="button"
        color="minimal"
        ref={buttonInView.ref}
        loading={isFetchingNextPage}
        disabled={!hasNextPage}
        onClick={() => fetchNextPage()}>
        {hasNextPage ? t("load_more_results") : t("no_more_results")}
      </Button>
    </div>
  );
};

const getInitialQuery = (config: ReturnType<typeof getQueryBuilderConfig>) => {
  const uuid = QbUtils.uuid();
  const queryValue: JsonTree = { id: uuid, type: "group" } as JsonTree;
  const tree = QbUtils.checkTree(QbUtils.loadTree(queryValue), config);
  return {
    state: { tree, config },
    queryValue,
  };
};

const Reporter = ({ form }: { form: inferSSRProps<typeof getServerSideProps>["form"] }) => {
  const config = getQueryBuilderConfig(form, true);
  const [query, setQuery] = useState(getInitialQuery(config));
  const [jsonLogicQuery, setJsonLogicQuery] = useState<JsonLogicResult | null>(null);
  const onChange = (immutableTree: ImmutableTree, config: QueryBuilderUpdatedConfig) => {
    const jsonTree = QbUtils.getTree(immutableTree);
    setQuery(() => {
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
    <div className="flex flex-col-reverse md:flex-row">
      <div className="cal-query-builder w-full ltr:mr-2 rtl:ml-2">
        <Query
          {...config}
          value={query.state.tree}
          onChange={(immutableTree, config) => {
            onChange(immutableTree, config as QueryBuilderUpdatedConfig);
          }}
          renderBuilder={renderBuilder}
        />
        <hr className="mt-6" />
        <Result formId={form.id} jsonLogicQuery={jsonLogicQuery as JsonLogicQuery} />
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
      Page={({ form }) => (
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
