import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField, Form, TextField } from "@calcom/ui/components/form";
import { PlusIcon, TrashIcon } from "@coss/ui/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type Dispatch, type SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

type IcsFeedSetupFormValues = Record<string, never>;

function getUrlContainerClassName(index: number): string {
  let className = "w-full";

  if (index === 0) {
    className += " mr-6";
  }

  return className;
}

function createUrlChangeHandler(
  setUrls: Dispatch<SetStateAction<string[]>>,
  index: number
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleUrlChange(event: ChangeEvent<HTMLInputElement>): void {
    const newValue = event.target.value;

    setUrls((currentUrls) =>
      currentUrls.map((currentUrl, currentIndex) => {
        if (currentIndex === index) {
          return newValue;
        }

        return currentUrl;
      })
    );
  };
}

function createUrlRemovalHandler(setUrls: Dispatch<SetStateAction<string[]>>, index: number): () => void {
  return function handleUrlRemoval(): void {
    setUrls((currentUrls) => currentUrls.filter((_, currentIndex) => currentIndex !== index));
  };
}

export default function ICSFeedSetup(): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm<IcsFeedSetupFormValues>({
    defaultValues: {},
  });

  const [urls, setUrls] = useState<string[]>([""]);
  const [skipWritingToCalendar, setSkipWritingToCalendar] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorActionUrl, setErrorActionUrl] = useState("");

  const handleSkipWritingChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSkipWritingToCalendar(event.target.checked);
  };

  const handleAddUrl = (): void => {
    setUrls((currentUrls) => currentUrls.concat(""));
  };

  const handleCancelClick = (): void => {
    router.back();
  };

  const handleFormSubmit = async (_values: IcsFeedSetupFormValues): Promise<void> => {
    setErrorMessage("");
    const res = await fetch("/api/integrations/ics-feedcalendar/add", {
      method: "POST",
      body: JSON.stringify({ urls, skipWriting: skipWritingToCalendar }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMessage(json?.message || t("something_went_wrong"));
      if (json.actionUrl) {
        setErrorActionUrl(json.actionUrl);
      }
    } else {
      router.push(json.url);
    }
  };

  return (
    <div className="flex h-screen bg-emphasis">
      <div className="m-auto rounded bg-default p-5 md:w-[560px] md:p-10">
        <div className="stack-y-5 md:stack-y-0 flex flex-col md:flex-row md:space-x-5">
          <div>
            <Image
              src="/api/app-store/ics-feedcalendar/icon.svg"
              alt="ICS Feed"
              width={48}
              height={48}
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default">{t("connect_ics_feed")}</h1>
            <div className="mt-1 text-sm">{t("credentials_stored_encrypted")}</div>
            <div className="my-2 mt-3">
              <Form form={form} handleSubmit={handleFormSubmit}>
                <fieldset className="stack-y-2" disabled={form.formState.isSubmitting}>
                  {urls.map((url, i) => (
                    <div key={url} className="flex w-full items-center gap-2">
                      <TextField
                        required
                        type="text"
                        label={t("calendar_url")}
                        value={url}
                        containerClassName={getUrlContainerClassName(i)}
                        onChange={createUrlChangeHandler(setUrls, i)}
                        placeholder="https://example.com/calendar.ics"
                      />
                      {i !== 0 && (
                        <button
                          type="button"
                          className="mb-2 h-min text-sm"
                          onClick={createUrlRemovalHandler(setUrls, i)}>
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <CheckboxField
                    checked={skipWritingToCalendar}
                    onChange={handleSkipWritingChange}
                    label={t("skip_writing_to_calendar")}
                    description={t("skip_writing_to_calendar_note")}
                  />
                </fieldset>

                <button className="text-sm" type="button" onClick={handleAddUrl}>
                  {t("add")} <PlusIcon className="inline" size={16} />
                </button>

                {errorMessage &&
                  (() => {
                    let actions: JSX.Element | undefined;
                    if (errorActionUrl !== "") {
                      actions = (
                        <Button
                          href={errorActionUrl}
                          color="secondary"
                          target="_blank"
                          className="ml-5 w-32 p-5!">
                          Go to Admin
                        </Button>
                      );
                    }

                    return <Alert severity="error" title={errorMessage} actions={actions} className="my-4" />;
                  })()}
                <div className="mt-5 justify-end space-x-2 sm:mt-4 sm:flex rtl:space-x-reverse">
                  <Button type="button" color="secondary" onClick={handleCancelClick}>
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
