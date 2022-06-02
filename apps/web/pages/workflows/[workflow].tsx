import { PencilIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import Shell from "@components/Shell";
import MultiSelectCheckboxes from "@components/ui/form/MultiSelectCheckboxes";

export type FormValues = {
  name: string;
  activeOn: { id: number; title: string; slug: string }[];
};

export default function WorkflowPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [editIcon, setEditIcon] = useState(true);
  const [evenTypeOptions, setEventTypeOptions] = useState<{ value: string; label: string }[]>([]);

  const { data, isLoading } = trpc.useQuery(["viewer.eventTypes"]);

  useEffect(() => {
    if (data) {
      let options: { value: string; label: string }[] = [];
      data.eventTypeGroups.forEach((group) => {
        options = group.eventTypes.map((eventType) => {
          return { value: String(eventType.id), label: eventType.title };
        });
      });
      setEventTypeOptions(options);
    }
  }, [isLoading]);

  const workflowId = router.query?.workflow as string;
  const query = trpc.useQuery([
    "viewer.workflows.get",
    {
      id: +workflowId,
    },
  ]);

  const formSchema = z.object({
    name: z.string().nonempty(),
    activeOn: z.object({ id: z.number(), title: z.string(), slug: z.string() }).array(),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  return (
    <div>
      <QueryCell
        query={query}
        success={({ data: workflow }) => {
          return (
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
                      return <MultiSelectCheckboxes options={evenTypeOptions} isLoading={isLoading} />;
                    }}
                  />
                </div>
              </>
            </Shell>
          );
        }}
      />
    </div>
  );
}
