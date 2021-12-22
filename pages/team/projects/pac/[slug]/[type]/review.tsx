import dayjs from "dayjs";
import { useRouter } from "next/router";
import React from "react";

import AutoSchedulingHeader from "@components/autoscheduling/Header";
import Button from "@components/ui/Button";

import { sitesTranslation, TSite } from "../../../../../../common/mock/sites";
import { getSSBeneficiary } from "../../../../../../common/utils/localstorage";
import { availableServices } from "../../service";

export default function Review() {
  const router = useRouter();

  const beneficiary = getSSBeneficiary();

  let service = "RG";
  const queryService = router.query.service;
  if (queryService && typeof queryService === "string") {
    service = availableServices.find((auxService) => auxService.id === queryService)?.name || "RG";
  }

  let site = "PAC";
  const querySite = router.query.slug;
  if (querySite && typeof queryService === "string") {
    site = sitesTranslation[querySite as TSite] || "PAC";
  }

  let date = "01-01-1990";
  const queryDate = router.query.date;
  if (queryDate && typeof queryDate === "string") {
    date = dayjs(queryDate, "YYYY-MM-DDZZ").format("DD/MM/YYYY");
  }

  let time = "00:00";
  const queryTime = router.query.time;
  if (queryTime && typeof queryTime === "string") {
    console.info(queryTime);
    time = dayjs(queryTime, "YYYY-MM-DDTHH:mm:ssZ").format("HH:mm");
  }

  const handleBack = () => {
    router.push({
      pathname: "book",
      query: router.query,
    });
  };

  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="p-4 bg-white">
        <AutoSchedulingHeader page="review" />
        <div className="mt-4 overflow-auto">
          <div className="border-y border-y-gray-100">
            <p className="text-gray-500 font-bold text-sm mt-4">Dados do beneficiário</p>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="font-bold pb-2 pt-4">Beneficiário</td>
                  <td className="pb-2 pt-4">{beneficiary?.name}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">E-mail</td>
                  <td className="py-2">{beneficiary?.email}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">CPF</td>
                  <td className="py-2">{beneficiary?.document}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Telefone</td>
                  <td className="py-2">{beneficiary?.phone}</td>
                </tr>
                <tr>
                  <td className="font-bold pt-2 pb-1">Grupo</td>
                  <td className="pt-2 pb-1">012</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-gray-500 font-bold text-sm mt-4">Solicitação</p>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="font-bold pb-2 pt-4">Serviço</td>
                  <td className="pb-2 pt-4">{service}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Local</td>
                  <td className="py-2">{site}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Data</td>
                  <td className="py-2">{date}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Horário</td>
                  <td className="py-2">{time}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button color="secondary" className="w-full justify-center" onClick={handleBack}>
            Anterior
          </Button>
          <Button className="w-full ml-4 justify-center">Próximo</Button>
        </div>
      </div>
    </div>
  );
}
