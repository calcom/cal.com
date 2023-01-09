import React, { useCallback, useRef, useState } from "react";
import {
  Builder,
  BuilderProps,
  Config,
  ImmutableTree,
  JsonLogicResult,
  JsonTree,
  Query,
  Utils as QbUtils,
} from "react-awesome-query-builder";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, Shell } from "@calcom/ui";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import { JsonLogicQuery } from "../../jsonLogicToPrisma";
import { getQueryBuilderConfig } from "../../lib/getQueryBuilderConfig";

export { getServerSideProps };

type QueryBuilderUpdatedConfig = typeof QueryBuilderInitialConfig & { fields: Config["fields"] };

const Result = ({ formId, jsonLogicQuery }: { formId: string; jsonLogicQuery: JsonLogicQuery | null }) => {
  const { t } = useLocale();

  const { isLoading, status, data, isFetching, error, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.viewer.appRoutingForms.report.useInfiniteQuery(
      {
        formId: formId,
        // Send jsonLogicQuery only if it's a valid logic, otherwise send a logic with no query.
        jsonLogicQuery: jsonLogicQuery?.logic
          ? jsonLogicQuery
          : {
              logic: {},
            },
      },
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
      <table
        data-testid="reporting-table"
        className="table-fixed border-separate border-spacing-0 rounded-md border border-gray-300 bg-gray-100">
        <tr data-testid="reporting-header" className="border-b border-gray-300 bg-gray-200">
          {headers.current?.map((header, index) => (
            <th
              className={classNames(
                "border-b border-gray-300 py-3 px-2  text-left text-base font-medium",
                index !== (headers.current?.length || 0) - 1 ? "border-r" : ""
              )}
              key={index}>
              {header}
            </th>
          ))}
        </tr>
        {!isLoading &&
          data?.pages.map((page) => {
            return page.responses?.map((responses, rowIndex) => {
              const isLastRow = page.responses.length - 1 === rowIndex;
              return (
                <tr
                  key={rowIndex}
                  data-testid="reporting-row"
                  className={classNames(
                    "text-center text-sm",
                    rowIndex % 2 ? "" : "bg-white",
                    isLastRow ? "" : "border-b"
                  )}>
                  {responses.map((r, columnIndex) => {
                    const isLastColumn = columnIndex === responses.length - 1;
                    return (
                      <td
                        className={classNames(
                          "overflow-x-hidden border-gray-300 py-3 px-2 text-left",
                          isLastRow ? "" : "border-b",
                          isLastColumn ? "" : "border-r"
                        )}
                        key={columnIndex}>
                        {r}
                      </td>
                    );
                  })}
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
