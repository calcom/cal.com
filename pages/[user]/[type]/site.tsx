import React, { useState } from "react";

import AutoSchedulingHeader from "@components/autoscheduling/Header";
import Button from "@components/ui/Button";

import { sitesTranslation } from "../../../common/mock/sites";

export default function Site() {
  const [selectedSite, setSelectedSite] = useState<string | undefined>(undefined);

  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="p-4 bg-white overflow-hidden">
        <AutoSchedulingHeader />
        <div className="overflow-auto mt-4 h-auto">
          <p className="text-gray-900 text-sm mb-2">Selecionar local:</p>
          {Object.entries(sitesTranslation).map(([key, name]: [string, string]) => {
            let style =
              "block px-4 py-3 text-sm mb-2 font-medium border rounded-sm dark:bg-gray-600 text-primary-500 dark:text-neutral-200 dark:border-transparent hover:text-white hover:bg-brand hover:text-brandcontrast dark:hover:border-black dark:hover:bg-brand dark:hover:text-brandcontrast";

            if (key === selectedSite) {
              style = `bg-gray-900 text-white-important ${style}`;
            } else {
              style = `bg-white text-black ${style}`;
            }

            return (
              <div key={`${key}-${name}`} className={style} onClick={() => setSelectedSite(key)}>
                {name}
              </div>
            );
          })}
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-md">
        <div className="flex flex-row w-full">
          <Button className="w-full mr-4 justify-center" disabled={!selectedSite}>
            Confirmar
          </Button>
          <Button color="secondary" className="w-full justify-center">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
