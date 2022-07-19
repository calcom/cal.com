import jsonLogic from "json-logic-js";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useRef, FormEvent } from "react";
import { Utils as QbUtils } from "react-awesome-query-builder";
import { Toaster } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

import showToast from "@calcom/lib/notification";
import { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui";
import { trpc } from "@calcom/web/lib/trpc";

import { getSerializableForm } from "../../utils";
import { getQueryBuilderConfig } from "../route-builder/[...appPages]";

export type Response = Record<
  string,
  {
    value: string | string[];
    label: string;
  }
>;

type Form = inferSSRProps<typeof getServerSideProps>["form"];

type Route = NonNullable<Form["routes"]>[0];

function RoutingForm({ form }: inferSSRProps<typeof getServerSideProps>) {
  const [customPageMessage, setCustomPageMessage] = useState<Route["action"]["value"]>("");
  const formFillerIdRef = useRef(uuidv4());

  // TODO: We might want to prevent spam from a single user by having same formFillerId across pageviews
  // But technically, a user can fill form multiple times due to any number of reasons and we currently can't differentiate b/w that.
  // - like a network error
  // - or he abandoned booking flow in between
  const formFillerId = formFillerIdRef.current;
  const decidedActionRef = useRef<Route["action"]>();
  const router = useRouter();

  const onSubmit = (response: Response) => {
    const decidedAction = processRoute({ form, response });

    if (!decidedAction) {
      // FIXME: Make sure that when a form is created, there is always a fallback route and then remove this.
      alert("Define atleast 1 route");
      return;
    }

    responseMutation.mutate({
      formId: form.id,
      formFillerId,
      response: response,
    });
    decidedActionRef.current = decidedAction;
  };

  const responseMutation = trpc.useMutation("viewer.app_routing_forms.public.response", {
    onSuccess: () => {
      const decidedAction = decidedActionRef.current;
      if (!decidedAction) {
        return;
      }

      //TODO: Maybe take action after successful mutation
      if (decidedAction.type === "customPageMessage") {
        setCustomPageMessage(decidedAction.value);
      } else if (decidedAction.type === "eventTypeRedirectUrl") {
        router.push(`/${decidedAction.value}`);
      } else if (decidedAction.type === "externalRedirectUrl") {
        window.location.href = decidedAction.value;
      }
      showToast("Form submitted successfully! Redirecting now ...", "success");
    },
    onError: (e) => {
      if (e?.message) {
        return void showToast(e?.message, "error");
      }
      if (e?.data?.code === "CONFLICT") {
        return void showToast("Form already submitted", "error");
      }
      showToast("Something went wrong", "error");
    },
  });

  const [response, setResponse] = useState<Response>({});

  const queryBuilderConfig = getQueryBuilderConfig(form);

  const handleOnSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(response);
  };

  return !customPageMessage ? (
    <>
      <Head>
        <title>{form.name} | Cal.com Forms</title>
      </Head>
      <div className="mx-auto my-0 max-w-3xl md:my-24">
        <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
          <div className="mx-0 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:-mx-4 sm:px-8">
            <Toaster position="bottom-right" />

            <form onSubmit={handleOnSubmit}>
              <div className="mb-8">
                <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
                  {form.name}
                </h1>
                {form.description ? (
                  <p className="min-h-10 text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">{form.description}</p>
                ) : null}
              </div>
              {form.fields?.map((field) => {
                const widget = queryBuilderConfig.widgets[field.type];
                if (!("factory" in widget)) {
                  return null;
                }
                const Component = widget.factory;

                const optionValues = field.selectText?.trim().split("\n");
                const options = optionValues?.map((value) => {
                  const title = value;
                  return {
                    value,
                    title,
                  };
                });
                return (
                  <div key={field.id} className="mb-4 block flex-col sm:flex ">
                    <div className="min-w-48 mb-2 flex-grow">
                      <label
                        id="slug-label"
                        htmlFor="slug"
                        className="flex text-sm font-medium text-neutral-700">
                        {field.label}
                      </label>
                    </div>
                    <div className="flex rounded-sm">
                      <Component
                        value={response[field.id]?.value}
                        // required property isn't accepted by query-builder types
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        /* @ts-ignore */
                        required={!!field.required}
                        listValues={options}
                        setValue={(value) => {
                          setResponse((response) => {
                            response = response || {};
                            return {
                              ...response,
                              [field.id]: {
                                label: field.label,
                                value,
                              },
                            };
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                <Button
                  loading={responseMutation.isLoading}
                  type="submit"
                  className="dark:text-darkmodebrandcontrast text-brandcontrast bg-brand dark:bg-darkmodebrand relative inline-flex items-center rounded-sm border border-transparent px-3 py-2 text-sm font-medium hover:bg-opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  ) : (
    <div className="mx-auto my-0 max-w-3xl md:my-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
          <div>{customPageMessage}</div>
        </div>
      </div>
    </div>
  );
}

function processRoute({ form, response }: { form: Form; response: Response }) {
  const queryBuilderConfig = getQueryBuilderConfig(form);

  const routes = form.routes || [];

  let decidedAction: Route["action"] | null = null;

  const fallbackRoute = routes.find((route) => route.isFallback);

  if (!fallbackRoute) {
    throw new Error("Fallback route is missing");
  }

  const reorderedRoutes = routes.filter((route) => !route.isFallback).concat([fallbackRoute]);

  reorderedRoutes.some((route) => {
    if (!route) {
      return false;
    }
    const state = {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), queryBuilderConfig),
      config: queryBuilderConfig,
    };
    const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
    const logic = jsonLogicQuery.logic;
    let result = false;
    const responseValues: Record<string, string | string[]> = {};
    for (const [uuid, { value }] of Object.entries(response)) {
      responseValues[uuid] = value;
    }
    if (logic) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = jsonLogic.apply(logic as any, responseValues);
    } else {
      // If no logic is provided, then consider it a match
      result = true;
    }
    if (result) {
      decidedAction = route.action;
      return true;
    }
  });

  return decidedAction;
}

export default function RoutingLink({ form }: { form: Form }) {
  return <RoutingForm form={form} />;
}

export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma
) {
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 1) {
    console.log(params.appPages);
    return {
      notFound: true,
    };
  }
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
  });

  if (!form || form.disabled) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      form: getSerializableForm(form),
    },
  };
};
