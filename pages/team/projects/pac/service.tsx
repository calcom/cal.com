import { useRouter } from "next/router";
import React, { useState } from "react";

import SelfSchedulingHeader from "@components/autoscheduling/Header";
import Button from "@components/ui/Button";

export const availableServices = [
  {
    name: "RG 1ª via",
    id: "rg_1via",
  },
  {
    name: "RG 2ª via",
    id: "rg_2via",
  },
];

export default function Service() {
  const router = useRouter();

  const [selectedService, setSelectedService] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    router.push({ pathname: "site", query: { ...router.query, service: selectedService } });
  };

  const handleBack = () => {
    router.push({ pathname: "data", query: router.query });
  };

  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="px-4 bg-white flex flex-col overflow-hidden">
        <SelfSchedulingHeader page="service" />
        <div className="flex-1 overflow-auto pb-4">
          <p className="mt-4 text-gray-900 text-sm mb-2">Selecionar serviço:</p>
          {availableServices.map((service) => {
            let style =
              "block p-4 mb-2 font-medium border rounded-sm dark:bg-gray-600 text-primary-500 dark:text-neutral-200 dark:border-transparent hover:text-white hover:bg-brand hover:text-brandcontrast dark:hover:border-black dark:hover:bg-brand dark:hover:text-brandcontrast";

            if (service.id === selectedService) {
              style = `bg-gray-900 text-white-important ${style}`;
            } else {
              style = `bg-white text-black ${style}`;
            }

            return (
              <div
                key={JSON.stringify(service)}
                className={style}
                onClick={() => setSelectedService(service.id)}>
                {service.name}
              </div>
            );
          })}
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button color="secondary" className="w-full justify-center" onClick={handleBack}>
            Anterior
          </Button>
          <Button className="w-full ml-4 justify-center" disabled={!selectedService} onClick={handleSubmit}>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}
