import React from "react";

import AutoSchedulingHeader from "@components/autoscheduling/Header";
import { TextField } from "@components/form/fields";
import Button from "@components/ui/Button";

export default function PersonalData() {
  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="p-4 bg-white">
        <AutoSchedulingHeader />
        <div className="mt-4">
          <TextField className="my-4" name="email" label="E-mail:" placeholder="Ex. jose.silva@gmail.com" />
          <TextField
            className="my-4"
            name="beneficiary"
            label="Nome do Beneficiário:"
            placeholder="Ex. José da Silva"
          />

          <TextField className="my-4" name="cpf" label="CPF:" placeholder="Ex. 123.456.789-10" />
          <TextField
            className="my-4"
            name="phone"
            label="Número de telefone:"
            placeholder="Ex. (99) 91234-5678"
          />
          <TextField name="group" label="Grupo:" placeholder="Ex. 012" />
          <p className="text-xs text-gray-500 mb-4 text-justify">
            Acompanhe o progresso de atendimento dos grupos através da nossa plataforma.
          </p>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notas adicionais
          </label>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm"
          />
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4">
        <div className="flex flex-row w-full">
          <Button className="w-full mr-4 justify-center">Confirmar</Button>
          <Button color="secondary" className="w-full justify-center">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
