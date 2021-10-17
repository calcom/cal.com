import Link from "next/link";
import { PropsWithChildren } from "react";
import { useForm, FormProvider } from "react-hook-form";

import { useLocale } from "@lib/hooks/useLocale";

import Shell from "@components/Shell";
import Button from "@components/ui/Button";
import Schedule, { TimeRange } from "@components/ui/form/Schedule";

type FormProps<TFormValues> = PropsWithChildren<{
  onSubmit: SubmitHandler<TFormValues>;
  className?: string;
}>;

type FormValues = {
  schedule: TimeRange[][];
};

const Form = <TFormValues extends Record<string, unknown> = Record<string, unknown>>({
  onSubmit,
  className = "",
  children,
}: FormProps<TFormValues>) => {
  const methods = useForm<TFormValues>();
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
};

export default function Availability() {
  const { t } = useLocale();
  const onSubmit = (data: FormValues) => console.log(data);

  return (
    <div>
      <Shell heading={t("availability")} subtitle={t("configure_availability")}>
        <div className="grid grid-cols-3 gap-2">
          <Form<FormValues> onSubmit={onSubmit} className="col-span-3 space-y-2 lg:col-span-2">
            <div className="px-4 py-5 bg-white border border-gray-200 divide-y rounded-sm sm:p-6">
              <h3 className="mb-4 text-lg font-semibold leading-6 text-gray-900">{t("change_start_end")}</h3>
              <Schedule name="schedule" />
            </div>
            <div className="text-right">
              <Button>Save</Button>
            </div>
          </Form>
          <div className="w-1/2 ml-2 border border-gray-200 rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {t("something_doesnt_look_right")}
              </h3>
              <div className="max-w-xl mt-2 text-sm text-gray-500">
                <p>{t("troubleshoot_availability")}</p>
              </div>
              <div className="mt-5">
                <Link href="/availability/troubleshoot">
                  <a className="btn btn-white">{t("launch_troubleshooter")}</a>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}
