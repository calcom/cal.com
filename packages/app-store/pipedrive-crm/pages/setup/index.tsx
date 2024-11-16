import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { stringify } from "querystring";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import z from "zod";

import { WebAppURL } from "@calcom/lib/WebAppURL";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { Button, Form, showToast, TextField } from "@calcom/ui";

const formSchema = z.object({
  client_id: z.string().min(5, "Client ID is required"),
  client_secret: z.string().min(5, "Client Secret is required"),
});

export default function PipedriveComSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const query = useRouterQuery();

  const { client_id, client_secret, ...rest } = query;
  const form = useForm<{
    client_id: string;
    client_secret: string;
  }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: (client_id || "") as string,
      client_secret: (client_secret || "") as string,
    },
  });

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[520px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/pipedrive-crm/icon.svg"
              alt="Pipe Drive"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div>
            <h1 className="text-default">{t("provide_credentials")}</h1>

            <div className="mt-1 text-sm">
              {t("generate_credentials_description", { appName: "Pipedrive.com" })}{" "}
              <a
                className="text-indigo-400"
                href="https://pipedrive.com"
                target="_blank"
                rel="noopener noreferrer">
                Pipedrive.com
              </a>
            </div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values) => {
                  console.log("entering the subit form", values);
                  const redirectUri = new WebAppURL(`/api/integrations/pipedrive-crm/callback`);
                  const returnTo = `https://oauth.pipedrive.com/oauth/authorize?client_id=${values.client_id}&redirect_uri=${redirectUri}`;
                  const newQuery = stringify({
                    ...rest,
                    returnTo: returnTo,
                  });
                  const url = new WebAppURL(`/api/integrations/pipedrive-crm/add/?${newQuery}`);

                  const res = await fetch(url.href, {
                    method: "POST",
                    body: JSON.stringify(values),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  const json = await res.json();

                  if (res.ok) {
                    router.push(json.url);
                  } else {
                    showToast(json.message, "error");
                  }
                }}>
                <fieldset className="space-y-2" disabled={form.formState.isSubmitting}>
                  <Controller
                    name="client_id"
                    control={form.control}
                    render={({ field }) => (
                      <TextField className="my-0" placeholder={t("provide_client_id")} {...field} />
                    )}
                  />
                  <Controller
                    name="client_secret"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        className="my-0"
                        placeholder={t("provide_client_secret")}
                        type="password"
                        {...field}
                      />
                    )}
                  />
                </fieldset>
                <div className="mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex">
                  <Button type="button" color="secondary" onClick={() => router.back()}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" loading={form.formState.isSubmitting}>
                    {t("save")}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
