import { PencilIcon } from "@heroicons/react/solid";
import { GetServerSidePropsContext } from "next";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Shell from "@components/Shell";
import SkeletonLoader from "@components/availability/SkeletonLoader";

export type FormValues = {
  name: string;
};

export default function WorkflowPage(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [editIcon, setEditIcon] = useState(true);
  const { workflow } = props;

  const formMethods = useForm<FormValues>({});

  return (
    <div>
      <Shell
        title="Title"
        heading={
          <div className="group relative cursor-pointer" onClick={() => setEditIcon(false)}>
            {editIcon ? (
              <>
                <h1
                  style={{ fontSize: 22, letterSpacing: "-0.0009em" }}
                  className="inline pl-0 text-gray-900 focus:text-black group-hover:text-gray-500">
                  {formMethods.getValues("name") && formMethods.getValues("name") !== ""
                    ? formMethods.getValues("name")
                    : workflow?.name}
                </h1>
                <PencilIcon className="ml-1 -mt-1 inline h-4 w-4 text-gray-700 group-hover:text-gray-500" />
              </>
            ) : (
              <div style={{ marginBottom: -11 }}>
                <input
                  type="text"
                  autoFocus
                  style={{ top: -6, fontSize: 22 }}
                  required
                  className="relative h-10 w-full cursor-pointer border-none bg-transparent pl-0 text-gray-900 hover:text-gray-700 focus:text-black focus:outline-none focus:ring-0"
                  placeholder={t("quick_chat")}
                  {...formMethods.register("name")}
                  defaultValue={workflow?.name}
                  onBlur={() => {
                    setEditIcon(true);
                    formMethods.getValues("name") === "" &&
                      formMethods.setValue("name", workflow?.name || "");
                  }}
                />
              </div>
            )}
          </div>
        }
        customLoader={<SkeletonLoader />}></Shell>
    </div>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const workflowParam = parseInt(asStringOrThrow(query.workflow));

  if (Number.isNaN(workflowParam)) {
    return {
      notFound: true,
    };
  }

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      AND: [
        {
          userId: session.user.id,
        },
        {
          id: workflowParam,
        },
      ],
    },
    select: {
      id: true,
      name: true,
      eventTypes: true,
      trigger: true,
      steps: true,
    },
  });

  return {
    props: {
      workflow,
    },
  };
};
