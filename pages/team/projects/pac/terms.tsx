import { CalendarIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import React from "react";

import SelfSchedulingHeader from "@components/autoscheduling/Header";
import GroupNoticeModal from "@components/team/projects/pac/GroupNoticeModal";
import Button from "@components/ui/Button";

export default function Terms() {
  const router = useRouter();
  const groups = ["1", "5"];

  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="flex items-center bg-indigo-100 px-4 py-2">
        <CalendarIcon className="text-indigo-700 mr-2 w-8" />
        <p className="text-sm font-bold text-indigo-700">{`Atenção! Estão sendo atendidos no momento os grupos: ${groups[0]} a ${groups[1]}.`}</p>
      </div>
      <div className="px-4 bg-white flex flex-col overflow-hidden">
        <SelfSchedulingHeader page="terms" />
        <div className="flex-1 overflow-auto pb-4">
          <p className="text-sm text-gray-600 text-justify">
            <b>1.</b> Você confirma e garante que tem dezoito anos ou mais. Caso você seja menor de idade, seu
            acesso será permitido desde que você esteja assistido ou representado por seus pais, tutores ou
            curadores, na forma da Lei, os quais serão considerados responsáveis por todos os atos praticados
            pelo menor;
            <br />
            <br />
            <b>2.</b> Você entende e concorda que é de sua responsabilidade garantir que o App esteja
            adequadamente instalado e configurado;
            <br />
            <br />
            <b>3.</b> Você compreende e confirma que o conteúdo que você registrou é certo, claro, verídico,
            possível e atualizado;
            <br />
            <br />
            <b>4.</b> Você entende e concorda que você é o único responsável por atualizar o seu registro e os
            seus dados;
            <br />
            <br />
            <b>5.</b> Você entende e aceita toda a responsabilidade legal pelo conteúdo, precisão e
            suficiência de todas as informações que forneceu;
            <br />
            <br />
            <b>6.</b> Você entende que é de sua responsabilidade corrigir suas informações de usuário quando
            estas estiverem erradas;
            <br />
            <br />
            <b>7.</b> Ademais, criar qualquer informação falsa/errada intencionalmente poderá, inclusive,
            importar no cancelamento de serviços;
            <br />
            <br />
            <b>8.</b> Você entende e concorda que ao solicitar mais de uma vez um serviço, apenas seu último
            cadastro será considerado para fins de prestação de serviços;
            <br />
            <br />
          </p>
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button color="secondary" className="w-full justify-center">
            Cancelar
          </Button>
          <Button
            className="w-full ml-4 justify-center"
            onClick={() => router.push({ pathname: "data", query: router.query })}>
            Eu concordo
          </Button>
        </div>
      </div>
      <GroupNoticeModal groups={groups} />
    </div>
  );
}
