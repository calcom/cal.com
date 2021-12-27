import React, { useEffect, useState } from "react";

import classNames from "@lib/classNames";

const DEFAULT_TITLE = "Condições";
const DEFAULT_STEP = "1";

type TPage = "data" | "service" | "site" | "book" | "review" | "terms";

interface IAutoSchedulingHeaderProps {
  page: TPage;
  className?: string;
}

export default function SelfSchedulingHeader({ page, className }: IAutoSchedulingHeaderProps) {
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const [step, setStep] = useState<string | undefined>(DEFAULT_STEP);

  useEffect(() => {
    switch (page) {
      case "data":
        setTitle("Dados Pessoais");
        setStep("2");
        break;
      case "service":
        setTitle("Serviços Disponíveis");
        setStep("3");
        break;
      case "site":
        setTitle("Locais Disponíveis");
        setStep("4");
        break;
      case "book":
        setTitle("Data e horário");
        setStep("5");
        break;
      case "review":
        setTitle("Revise sua solicitação");
        setStep(undefined);
        break;
      case "terms":
      default:
        setTitle(DEFAULT_TITLE);
        setStep(DEFAULT_STEP);
        break;
    }
  }, []); // eslint-disable-line

  return (
    <div className={classNames("flex flex-row justify-between items-center py-4", className)}>
      <h1 className="text-2xl font-bold">{title}</h1>
      {step && <p className="text-xs text-gray-500 font-bold">{`${step}/5`}</p>}
    </div>
  );
}
