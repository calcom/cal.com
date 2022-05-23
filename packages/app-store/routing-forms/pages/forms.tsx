import { TrashIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@calcom/ui";
import { trpc } from "@calcom/web/lib/trpc";

import Shell from "@components/Shell";

export default function Forms() {
  const router = useRouter();
  const slug = router.query.slug;
  const page = router.query.page;
  const { isLoading, data: forms, error } = trpc.useQuery(["viewer.app_routing-forms.forms"]);
  const deleteMutation = trpc.useMutation("viewer.app_routing-forms.deleteForm");
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.app_routing-forms.form", {
    onSettled: (data, error, variables) => {
      utils.invalidateQueries("viewer.app_routing-forms.forms");
      router.push(`/apps/routing-forms/form/${variables.id}`);
    },
  });

  if (isLoading) {
    return null;
  }
  if (error) {
    throw new Error(error);
  }

  return (
    <Shell heading="Routing Forms" subtitle="You can see all routing forms and create one here.">
      <div className="-mx-4 md:-mx-8">
        <div className="mb-10 bg-gray-50 px-4 pb-2">
          <div>
            {forms.map((form, index) => {
              return (
                <div
                  key={index}
                  className="-mx-4 mb-4 flex w-full max-w-4xl rounded-sm border border-neutral-200 bg-white p-4 py-6 text-left ltr:mr-2 rtl:ml-2 sm:mx-0 sm:px-8 lg:w-9/12">
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      router.push(`/apps/routing-forms/form/${form.id}`);
                    }}>
                    <div className="">{form.name}</div>
                    <div className="text-neutral-500">{form.fields.length} fields</div>
                  </button>
                  <button
                    className="h-4 w-4"
                    onClick={() => {
                      deleteMutation.mutate({
                        id: form.id,
                      });
                    }}>
                    <TrashIcon></TrashIcon>
                  </button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            onClick={() => {
              const form = {
                id: uuidv4(),
                name: "New Form",
              };
              mutation.mutate(form);
            }}>
            Add new Form
          </Button>
        </div>
      </div>
    </Shell>
  );
}
