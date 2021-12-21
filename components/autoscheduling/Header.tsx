import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const DEFAULT_PATH_1 = "[user]";
const DEFAULT_PATH_2 = "[type]";

const DEFAULT_TITLE = "Termos e Condições";
const DEFAULT_STEP = "1";

export default function AutoSchedulingHeader() {
  const router = useRouter();
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const [step, setStep] = useState<string>(DEFAULT_STEP);

  useEffect(() => {
    const path = router.pathname;

    const brokePath = path.split("/");

    if (brokePath.length >= 3) {
      if (brokePath[1] === DEFAULT_PATH_1 && brokePath[2] === DEFAULT_PATH_2) {
        const actualStep = brokePath[3];

        switch (actualStep) {
          case "data":
            setTitle("Dados Pessoais");
            setStep("2");
            break;
          case "service":
            setTitle("Serviço");
            setStep("3");
            break;
          case "terms":
          default:
            setTitle(DEFAULT_TITLE);
            setStep(DEFAULT_STEP);
            break;
        }
      }
    }
  }, []); // eslint-disable-line

  return (
    <div className="flex flex-row justify-between items-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-xs text-gray-500 font-bold">{`${step}/5`}</p>
    </div>
  );
}
