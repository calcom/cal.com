import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Select, showToast } from "@calcom/ui";

export interface IAppConfigurationProps {
  credentialIds: number[];
}

const saveSettings = async ({
  parameter,
  sleepValue,
}: {
  parameter: { label: string; value: string };
  sleepValue: number;
}) => {
  try {
    const response = await fetch("/api/integrations/vital/save", {
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

const AppConfiguration = (props: IAppConfigurationProps) => {
  const { t } = useTranslation();
  const [credentialId] = props.credentialIds;

  const options = [
    {
      label: t("vital_app_total_label", { ns: "vital" }),
      value: "total",
    },
    {
      label: t("vital_app_duration_label", { ns: "vital" }),
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
      const response = await fetch("/api/integrations/vital/settings", {
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
          {t("connected_vital_app", { ns: "vital" })} Vital App: {connected ? "Yes" : "No"}
        </strong>
      </p>
      <br />
      <p>
        <strong>{t("vital_app_sleep_automation", { ns: "vital" })}</strong>
      </p>
      <p className="mt-1">{t("vital_app_automation_description", { ns: "vital" })}</p>

      <div className="w-100 mt-2">
        <div className="block sm:flex">
          <div className="min-w-24 mb-4 mt-5 sm:mb-0">
            <label htmlFor="description" className="text-sm font-bold">
              {t("vital_app_parameter", { ns: "vital" })}
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
            {t("vital_app_trigger", { ns: "vital" })}
          </label>
        </div>
        <div className="mx-2 mt-0 inline-flex w-24 items-baseline">
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
            className="pr-12shadow-sm mt-1 block w-full rounded-sm border border-gray-300 py-2 pl-6 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          />
          <p className="ml-2">
            <strong>{t("vital_app_hours", { ns: "vital" })}</strong>
          </p>
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
          {t("vital_app_save_button", { ns: "vital" })}
        </Button>
      </div>
    </div>
  );
};

export default AppConfiguration;
