import { useEffect, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import Select from "@components/ui/form/Select";

interface IVitalsConfigurationProps {
  isVisible: boolean;
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
  const { t } = useLocale();
  const options = [
    {
      label: "Total (total = rem + light sleep + deep sleep)",
      value: "total",
    },
    {
      label: "Duration (duration = bedtime end - bedtime start)",
      value: "duration",
    },
  ];
  const [selectedParam, setSelectedParam] = useState<{ label: string; value: string }>(options[0]);
  const [touchedForm, setTouchedForm] = useState(false);
  const defaultSleepValue = 0;
  const [sleepValue, setSleepValue] = useState(defaultSleepValue);
  const [connected, setConnected] = useState(true);
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
        if (vitalSettings && vitalSettings.connected && vitalSettings.sleepValue && vitalSettings.parameter) {
          const selectedParam = options.find((item) => item.value === vitalSettings.parameter);
          if (selectedParam) {
            setSelectedParam(selectedParam);
          }
          setSleepValue(vitalSettings.sleepValue);
          setConnected(vitalSettings.connected);
        }
      }
    }
    getVitalsConfig();
  }, []);

  if (!props.isVisible) {
    return <></>;
  }

  const disabledSaveButton = !touchedForm || sleepValue === 0;
  return (
    <div className="flex-col items-start p-3 text-sm">
      <p>
        <strong>Connected with Vital App: {connected ? "Yes" : "No"}</strong>
      </p>
      <br />
      <p>
        <strong>Sleeping reschedule automation</strong>
      </p>
      <p className="mt-1">
        You can select different parameters to trigger the reschedule based on your sleeping metrics.
      </p>

      <div className="w-100 mt-2">
        <div className="block sm:flex">
          <div className="min-w-24 mb-4 mt-5 sm:mb-0">
            <label htmlFor="description" className="text-sm font-bold">
              Parameter
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
            Trigger at below or equal than
          </label>
        </div>
        <div
          className={classNames(
            "mx-2 mt-0 w-24",
            "relative",
            "after:absolute after:right-2 after:top-[12px] after:content-['hours'] sm:after:top-[9px]"
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
          onClick={() => {
            saveSettings({ parameter: selectedParam, sleepValue: sleepValue });
          }}
          disabled={disabledSaveButton}>
          Save configuration
        </Button>
      </div>
    </div>
  );
};

export { VitalsConfiguration };
