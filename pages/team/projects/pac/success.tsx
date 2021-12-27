import React, { useEffect, useState } from "react";
import Lottie, { Options } from "react-lottie";

import Button from "@components/ui/Button";

import approvedAnimation from "../../../../assets/lottie/check_animation.json";
import deniedAnimation from "../../../../assets/lottie/denied_animation.json";
import waitingAnimation from "../../../../assets/lottie/timer-loader.json";

const WAITING_HEADER = "Solicitação em análise";
const WAITING_HELPER_TEXT = "Insira aqui o texto de solicitação em análise. Isso pode levar alguns segundos.";

const APPROVED_HEADER = "Solicitação aprovada";
const APPROVED_HELPER_TEXT =
  "Insira aqui o texto de solicitação aprovada. Insira aqui o texto de solicitação aprovada. ";

const DENIED_HEADER = "Solicitação negada";
const DENIED_HELPER_TEXT = "Sua solicitação não pode ser aprovada pois motivo foi a causa.";

export default function Success() {
  const [wasApproved, setWasApproved] = useState<boolean | undefined>();
  const [header, setHeader] = useState<string>(WAITING_HEADER);
  const [helperText, setHelperText] = useState<string>(WAITING_HELPER_TEXT);
  const [isLoading, setIsLoading] = useState(true);
  const [animation, setAnimation] = useState<Options>({
    autoplay: true,
    animationData: waitingAnimation,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  });

  useEffect(() => {
    const timeout1 = setTimeout(() => {
      setIsLoading(false);
      setWasApproved(true);
      console.info("APPROVED");
    }, 5000);

    const timeout2 = setTimeout(() => {
      setWasApproved(false);
      console.info("DENIED");
    }, 10000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && wasApproved !== undefined) {
      if (wasApproved) {
        setAnimation((prevState) => ({
          ...prevState,
          loop: false,
          animationData: approvedAnimation,
        }));
        setHeader(APPROVED_HEADER);
        setHelperText(APPROVED_HELPER_TEXT);
      } else {
        setAnimation((prevState) => ({
          ...prevState,
          loop: false,
          animationData: deniedAnimation,
        }));
        setHeader(DENIED_HEADER);
        setHelperText(DENIED_HELPER_TEXT);
      }
    }
  }, [isLoading, wasApproved]);

  return (
    <div className="bg-gray-100 h-screen flex flex-col justify-between">
      <div className="mt-4 px-4 flex flex-col items-center">
        <Lottie options={animation} height={142} width={142} isClickToPauseDisabled />
        <h2 className="text-2xl font-bold">{header}</h2>
        <p className="text-gray-500 text-center mt-2">{helperText}</p>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button className="w-full justify-center">Finalizar</Button>
        </div>
      </div>
    </div>
  );
}
