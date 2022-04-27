import { useEffect, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";

import Select from "@components/ui/form/Select";

interface IVitalsConfigurationProps {
  trpc: any;
}

const saveSettings = async ({
  parameter,
  sleepValue,
}: {
  parameter: { label: string; value: string };
  sleepValue: number;
}) => {
  try {
    const response = await fetch("/api/integrations/vitalother/save", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sleepValue,
        parameter: parameter.value,
      }),
    });
    if (response.ok && response.status === 200) {
      return true;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

const VitalsConfiguration = (props: IVitalsConfigurationProps) => {
  const { trpc } = props;
  const { t } = useLocale();
  const { data } = trpc.useQuery(["viewer.integrations"]);
  const vitalCredentials: { credentialIds: number[] } = data?.other?.items.find(
    (item: { type: string }) => item.type === "vital_other"
  );

  const [credentialId] = vitalCredentials?.credentialIds || [false];

  const options = [
    {
      label: t("vital_app_total_label"),
      value: "total",
    },
    {
      label: t("vital_app_duration_label"),
      value: "duration",
    },
  ];
  const [selectedParam, setSelectedParam] = useState<{ label: string; value: string }>(options[0]);
  const [touchedForm, setTouchedForm] = useState(false);
  const defaultSleepValue = 0;
  const [sleepValue, setSleepValue] = useState(defaultSleepValue);
  const [connected, setConnected] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  useEffect(() => {
    async function getVitalsConfig() {
      const response = await fetch("/api/integrations/vitalother/settings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.status === 200) {
        const vitalSettings: {
          connected: boolean;
          parameter: string;
          sleepValue: number;
        } = await response.json();

        if (vitalSettings && vitalSettings.connected) {
          setConnected(vitalSettings.connected);
        }
        if (vitalSettings.sleepValue && vitalSettings.parameter) {
          const selectedParam = options.find((item) => item.value === vitalSettings.parameter);
          if (selectedParam) {
            setSelectedParam(selectedParam);
          }
          setSleepValue(vitalSettings.sleepValue);
        }
      }
    }
    getVitalsConfig();
  }, []);

  if (!credentialId) {
    return <></>;
  }

  const disabledSaveButton = !touchedForm || sleepValue === 0;
  return (
    <div className="flex-col items-start p-3 text-sm">
      <p>
        <strong>
          {t("connected_vital_app")} Vital App: {connected ? "Yes" : "No"}
        </strong>
      </p>
      <br />
      <p>
        <strong>{t("vital_app_sleep_automation")}</strong>
      </p>
      <p className="mt-1">{t("vital_app_automation_description")}</p>

      <div className="w-100 mt-2">
        <div className="block sm:flex">
          <div className="min-w-24 mb-4 mt-5 sm:mb-0">
            <label htmlFor="description" className="text-sm font-bold">
              {t("vital_app_parameter")}
            </label>
          </div>
          <div className="w-120 mt-2.5">
            <Select
              options={options}
              value={selectedParam}
              onChange={(e) => {
                e && setSelectedParam(e);
                setTouchedForm(true);
              }}
            />
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="min-w-24 mb-4 mt-3">
          <label htmlFor="value" className="text-sm font-bold">
            {t("vital_app_trigger")}
          </label>
        </div>
        <div
          className={classNames(
            "mx-2 mt-0 w-24",
            "relative",
            "after:absolute after:right-2 after:top-[12px] sm:after:top-[9px]",
            `after:content-['hours']`
          )}>
          <input
            id="value"
            type="text"
            pattern="\d*"
            maxLength={2}
            value={sleepValue}
            onChange={(e) => {
              setSleepValue(Number(e.currentTarget.value));
              setTouchedForm(true);
            }}
            className={
              "pr-12shadow-sm mt-1 block w-full rounded-sm border border-gray-300 py-2 pl-6 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            }
          />
        </div>
      </div>

      <div>
        <Button
          className="my-4"
          onClick={async () => {
            try {
              setSaveLoading(true);
              await saveSettings({ parameter: selectedParam, sleepValue: sleepValue });
              showToast(t("vital_app_save_success"), "success");
            } catch (error) {
              showToast(t("vital_app_save_error"), "error");
              setSaveLoading(false);
            }
            setTouchedForm(false);
            setSaveLoading(false);
          }}
          loading={saveLoading}
          disabled={disabledSaveButton}>
          {t("vital_app_save_button")}
        </Button>
      </div>
    </div>
  );
};

export { VitalsConfiguration };
