import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import showToast from "@lib/notification";

import AutoSchedulingHeader from "@components/autoscheduling/Header";
import { TextField } from "@components/form/fields";
import Button from "@components/ui/Button";
import PhoneInput from "@components/ui/form/PhoneInput";

import { IBeneficiary, setSSBeneficiary } from "../../../../common/utils/localstorage";
import { validateCpf, validateEmail, validateName, validatePhone } from "../../../../common/utils/validators";

type TError = "email" | "beneficiary" | "document" | "phone";

export default function PersonalData() {
  const router = useRouter();

  const [email, setEmail] = useState<string>();
  const [name, setName] = useState<string>();
  const [document, setDocument] = useState<string>();
  const [phone, setPhone] = useState<string>();
  const [notes, setNotes] = useState<string>();

  const [error, setError] = useState<TError>();

  const handleSubmit = () => {
    if (!name || !validateName(name)) {
      setError("beneficiary");
      return;
    }
    if (!email || !validateEmail(email)) {
      setError("email");
      return;
    }
    if (!document || !validateCpf(document)) {
      setError("document");
      return;
    }
    if (!phone || !validatePhone(phone)) {
      setError("phone");
      return;
    }

    const beneficiary: IBeneficiary = {
      name,
      email,
      document,
      phone,
      notes,
    };

    setSSBeneficiary(beneficiary);
    router.push({ pathname: "service", query: router.query });
  };

  const handleBack = () => {
    router.push({ pathname: "terms", query: router.query });
  };

  useEffect(() => {
    console.log(phone);
  }, [phone]);

  useEffect(() => {
    if (error) {
      let errorMessage = "";
      switch (error) {
        case "beneficiary":
          errorMessage = "Por favor, digite o seu nome completo.";
          break;
        case "email":
          errorMessage = "Por favor, digite o um email válido.";
          break;
        case "document":
          errorMessage = "Por favor, digite um CPF válido.";
          break;
        case "phone":
          errorMessage = "Por favor, digite um número de telefone válido.";
          break;
      }
      showToast(errorMessage, "error");
      setError(undefined);
    }
  }, [error]);

  return (
    <>
      <div>
        <Toaster position="top-center" />
      </div>
      <div className="bg-gray-200 h-screen flex flex-col justify-between">
        <div className="p-4 bg-white">
          <AutoSchedulingHeader page="data" />
          <div className="mt-4">
            <TextField
              required
              className="my-4"
              name="beneficiary"
              label="Nome do Beneficiário:"
              placeholder="Ex. José da Silva"
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              required
              className="my-4"
              name="email"
              label="E-mail:"
              placeholder="Ex. jose.silva@gmail.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              required
              className="my-4"
              name="cpf"
              label="CPF:"
              placeholder="Ex. 123.456.789-10"
              onChange={(e) => setDocument(e.target.value)}
            />
            <div className="my-4">
              <label className="text-sm font-medium text-gray-700" htmlFor="phone">
                Número de telefone:
              </label>
              <PhoneInput
                name="phone"
                defaultCountry="BR"
                value={phone}
                className="text-base"
                placeholder="Ex. (99) 91234-5678"
                onChange={(value: string) => setPhone(value)}
              />
            </div>
            {/*<TextField*/}
            {/*  disabled*/}
            {/*  name="group"*/}
            {/*  label="Grupo:"*/}
            {/*  placeholder="Ex. 012"*/}
            {/*  onChange={(e) => setGroup(e.target.value)}*/}
            {/*/>*/}
            {/*<p className="text-xs text-gray-500 mb-4 text-justify">*/}
            {/*  Acompanhe o progresso de atendimento dos grupos através da nossa plataforma.*/}
            {/*</p>*/}
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notas adicionais
            </label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
          <div className="flex flex-row w-full">
            <Button color="secondary" className="w-full justify-center" onClick={handleBack}>
              Anterior
            </Button>
            <Button className="w-full ml-4 justify-center" onClick={handleSubmit}>
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
