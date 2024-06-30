"use client";

import React, { useCallback, useRef, useState } from "react";
import type {
  BuilderProps,
  Config,
  ImmutableTree,
  JsonLogicResult,
  JsonTree,
} from "react-awesome-query-builder";
import { Builder, Query, Utils as QbUtils } from "react-awesome-query-builder";

import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import type QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import type { JsonLogicQuery } from "../../jsonLogicToPrisma";
import { getQueryBuilderConfig } from "../../lib/getQueryBuilderConfig";

export { getServerSideProps };

type QueryBuilderUpdatedConfig = typeof QueryBuilderInitialConfig & { fields: Config["fields"] };

const Result = ({ formId, jsonLogicQuery }: { formId: string; jsonLogicQuery: JsonLogicQuery | null }) => {
  const { t } = useLocale();

  const { isPending, status, data, isFetching, error, isFetchingNextPage, hasNextPage, fetchNextPage } =
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

  if (!isPending && !data) {
    return <div>Error loading report {error?.message} </div>;
  }
  headers.current = (data?.pages && data?.pages[0]?.headers) || headers.current;

  return (
    <div className="w-full max-w-[2000px] overflow-x-scroll">
      <table
        data-testid="reporting-table"
        className="border-default bg-subtle mx-3 mb-4 table-fixed border-separate border-spacing-0 overflow-hidden rounded-md border">
        <tr
          data-testid="reporting-header"
          className="border-default text-default bg-emphasis rounded-md border-b">
          {headers.current?.map((header, index) => (
            <th
              className={classNames(
                "border-default border-b px-2 py-3  text-left text-base font-medium",
                index !== (headers.current?.length || 0) - 1 ? "border-r" : ""
              )}
              key={index}>
              {header}
            </th>
          ))}
        </tr>
        {!isPending &&
          data?.pages.map((page) => {
            return page.responses?.map((responses, rowIndex) => {
              const isLastRow = page.responses.length - 1 === rowIndex;
              return (
                <tr
                  key={rowIndex}
                  data-testid="reporting-row"
                  className={classNames(
                    "text-center text-sm",
                    rowIndex % 2 ? "" : "bg-default",
                    isLastRow ? "" : "border-b"
                  )}>
                  {responses.map((r, columnIndex) => {
                    const isLastColumn = columnIndex === responses.length - 1;
                    return (
                      <td
                        className={classNames(
                          "border-default overflow-x-hidden px-2 py-3 text-left",
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
      {isPending ? <div className="text-default p-2">{t("loading")}</div> : ""}
      {hasNextPage && (
        <Button
          type="button"
          color="minimal"
          ref={buttonInView.ref}
          loading={isFetchingNextPage}
          disabled={!hasNextPage}
          onClick={() => fetchNextPage()}>
          {hasNextPage ? t("load_more_results") : t("no_more_results")}
        </Button>
      )}
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
    <div className="cal-query-builder bg-default fixed inset-0 w-full overflow-scroll pt-12 ltr:mr-2 rtl:ml-2 sm:pt-0">
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
