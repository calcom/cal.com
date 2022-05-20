import { useRouter } from "next/router";

import { Button } from "@calcom/ui";
import { trpc } from "@calcom/web/lib/trpc";

import Shell from "@components/Shell";

export default function Forms() {
  const router = useRouter();
  const slug = router.query.slug;
  const page = router.query.page;
  const { isLoading, data: forms, error } = trpc.useQuery(["viewer.app_routing-forms.forms"]);
  const mutation = trpc.useMutation("viewer.app_routing-forms.form");
  if (isLoading) {
    return null;
  }
  if (error) {
    throw new Error(error);
  }

  return (
    <Shell>
      <div className="-mx-4 md:-mx-8">
        <div className="mb-10 bg-gray-50 px-4 pb-2">
          <div>
            <Button
              onClick={() => {
                mutation.mutate({
                  name: "Form " + Date.now(),
                });
              }}>
              Add new Form
            </Button>
            {forms.map((form, index) => {
              return (
                <div
                  key={index}
                  onClick={() => {
                    router.push(`/apps/routing-forms/form/${form.id}`);
                  }}>
                  {form.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
