import { PencilIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { GetServerSidePropsContext } from "next";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Shell from "@components/Shell";
import MultiSelectCheckboxes from "@components/ui/form/MultiSelectCheckboxes";

export type FormValues = {
  name: string;
  activeOn: { id: number; title: string; slug: string }[];
};

export default function WorkflowPage(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [editIcon, setEditIcon] = useState(true);
  const { workflow } = props;

  const formSchema = z.object({
    name: z.string().nonempty(),
    activeOn: z.object({ id: z.number(), title: z.string(), slug: z.string() }).array(),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });

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
                  {form.getValues("name") && form.getValues("name") !== ""
                    ? form.getValues("name")
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
                  placeholder={t("Custom workflow")}
                  {...form.register("name")}
                  defaultValue={workflow?.name}
                  onBlur={() => {
                    setEditIcon(true);
                    form.getValues("name") === "" && form.setValue("name", workflow?.name || "");
                  }}
                />
              </div>
            )}
          </div>
        }>
        <>
          <div className="-mt-7 space-y-1">
            <label htmlFor="label" className="blocktext-sm mb-2 font-medium text-gray-700">
              {t("active_on")}:
            </label>
            <Controller
              name="activeOn"
              control={form.control}
              render={() => {
                return <MultiSelectCheckboxes />;
              }}
            />
          </div>
        </>
      </Shell>
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
