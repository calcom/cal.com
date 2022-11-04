import { useAutoAnimate } from "@formkit/auto-animate/react";
import { App_RoutingForms_Form } from "@prisma/client";
import React, { useState, useCallback } from "react";
import { Query, Config, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonTree, ImmutableTree, BuilderProps } from "react-awesome-query-builder";

import { trpc } from "@calcom/trpc/react";
import {
  AppGetServerSidePropsContext,
  AppPrisma,
  AppUser,
  AppSsrInit,
} from "@calcom/types/AppGetServerSideProps";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Icon } from "@calcom/ui";
import { Button, TextField, SelectWithValidation as Select, TextArea, Shell } from "@calcom/ui/v2";
import FormCard from "@calcom/ui/v2/core/form/FormCard";

import SingleForm from "../../components/SingleForm";
import QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { SerializableForm } from "../../types/types";
import { FieldTypes } from "../form-edit/[...appPages]";
import { getQueryBuilderConfig } from "../route-builder/[...appPages]";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

const InitialConfig = QueryBuilderInitialConfig;
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
  const { isLoading, data: report } = trpc.useQuery([
    "viewer.app_routing_forms.report",
    {
      formId: formId,
      jsonLogicQuery,
    },
  ]);
  if (isLoading) {
    return <div>Report is loading</div>;
  }
  if (!report) {
    return <div>Couldn't load report</div>;
  }
  return (
    <table className="w-full table-auto">
      <tr>
        {report.headers.map((header, index) => (
          <th key={index}>{header}</th>
        ))}
      </tr>

      {report.responses?.map((response, index) => {
        return (
          <tr key={index} className="text-center">
            {Object.entries(response.response).map(([_, r], index) => (
              <td key={index}>{r.value}</td>
            ))}
          </tr>
        );
      })}
    </table>
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
      <div>{JSON.stringify(QbUtils.jsonLogicFormat(reporterRowQuery.state.tree, config))}</div>
      <hr className="mt-10" />
      <Query
        {...config}
        value={reporterRowQuery.state.tree}
        onChange={(immutableTree, config) => {
          onChange(immutableTree, config as QueryBuilderUpdatedConfig);
        }}
        renderBuilder={renderBuilder}
      />
      <hr className="mt-10" />
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
  const config = getQueryBuilderConfig(form);

  return (
    <div className="flex flex-col-reverse md:flex-row">
      <div className="w-full ltr:mr-2 rtl:ml-2">
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
