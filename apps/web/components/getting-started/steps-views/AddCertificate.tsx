import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { Button, Input, showToast } from "@calcom/ui";

enum CertificateRegistrationStatus {
  PASSWORD_ERROR = "Senha do certificado inválida.",
  CERTIFICATE_ALREADY_REGISTERED = "Esse certificado já está cadastrado.",
}

const SPEDY_BASE_URL = "https://api.spedy.com.br/v1";
const SPEDY_API_KEY = process.env.NEXT_PUBLIC_SPEDY_API_KEY || "";
const DIRECTUS_BASE_URL = "https://painel.yinflow.life/items";
const DIRECTUS_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_TOKEN || "";

const AddCertificate = () => {
  const router = useRouter();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const pickerRef = useRef<HTMLInputElement>(null);

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      router.replace("/signup-success");
    },
    onError: () => {
      showToast("Erro ao atualizar seu usuário.", "error");
    },
  });

  const [a1Src, setA1Src] = useState<File | null>(null);
  const [spedyCompanyID, setSpedyCompanyID] = useState<string>("");
  const [a1Password, setA1Password] = useState<string>("");
  const [retypeA1Password, setretypeA1Password] = useState<string>("");
  const [certificateRegistrationStatus, setCertificateRegistrationStatus] =
    useState<CertificateRegistrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const disabledButton = useMemo(() => {
    const emptyFields = retypeA1Password === "" || a1Password === "" || !a1Src;
    return emptyFields || a1Password !== retypeA1Password;
  }, [a1Password, a1Src, retypeA1Password]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    setA1Src(selectedFile as File);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!a1Src) return;
    setCertificateRegistrationStatus(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("certificateFile", a1Src);
    formData.append("password", a1Password);

    fetch(`${SPEDY_BASE_URL}/companies/${spedyCompanyID}/certificates`, {
      method: "POST",
      headers: {
        "X-Api-Key": SPEDY_API_KEY,
      },
      body: formData,
    })
      .then((response) => {
        response.json().then(({ errors }) => {
          if (errors && errors.length > 0)
            switch (errors[0].message) {
              case CertificateRegistrationStatus.CERTIFICATE_ALREADY_REGISTERED:
                setCertificateRegistrationStatus(
                  CertificateRegistrationStatus.CERTIFICATE_ALREADY_REGISTERED
                );
                break;
              case CertificateRegistrationStatus.PASSWORD_ERROR:
                setCertificateRegistrationStatus(CertificateRegistrationStatus.PASSWORD_ERROR);
                break;
            }
          else mutation.mutate({ completedOnboarding: true });
        });
      })
      .finally(() => {
        setIsLoading(false);
      });

    event.preventDefault();
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetch(`${DIRECTUS_BASE_URL}/pro_professionals?filter[cal_user_id][_eq]=${42}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
      })
        .then((response) => {
          response.json().then((response) => {
            const proProfessionalId = response.data[0].id;
            fetch(
              `${DIRECTUS_BASE_URL}/pro_professional_companies?filter[pro_professional_id][_eq]=${proProfessionalId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                },
              }
            )
              .then((response) => {
                response.json().then((response) => {
                  const spedyId = response.data[0].spedy_id;
                  setSpedyCompanyID(spedyId);
                });
              })
              .finally(() => {
                setIsLoading(false);
              });
          });
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col items-center justify-start rtl:justify-end">
        <div className="flex w-full flex-row items-center">
          <input
            type="file"
            id="CNPJ_A1"
            name="CNPJ_A1"
            ref={pickerRef}
            accept="application/x-pkcs12"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            className={`mr-2 flex h-16 w-16 items-center justify-center	rounded-lg ${
              a1Src ? "bg-[#06C6A3]" : "bg-[#E5E7EB]"
            }`}>
            {a1Src ? (
              <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <path
                  d="M14.2806 7.21937C14.3504 7.28903 14.4057 7.37175 14.4434 7.46279C14.4812 7.55384 14.5006 7.65144 14.5006 7.75C14.5006 7.84856 14.4812 7.94616 14.4434 8.03721C14.4057 8.12825 14.3504 8.21097 14.2806 8.28063L9.03063 13.5306C8.96097 13.6004 8.87826 13.6557 8.78721 13.6934C8.69616 13.7312 8.59857 13.7506 8.5 13.7506C8.40144 13.7506 8.30385 13.7312 8.2128 13.6934C8.12175 13.6557 8.03903 13.6004 7.96938 13.5306L5.71938 11.2806C5.57865 11.1399 5.49959 10.949 5.49959 10.75C5.49959 10.551 5.57865 10.3601 5.71938 10.2194C5.86011 10.0786 6.05098 9.99958 6.25 9.99958C6.44903 9.99958 6.6399 10.0786 6.78063 10.2194L8.5 11.9397L13.2194 7.21937C13.289 7.14964 13.3718 7.09432 13.4628 7.05658C13.5538 7.01884 13.6514 6.99941 13.75 6.99941C13.8486 6.99941 13.9462 7.01884 14.0372 7.05658C14.1283 7.09432 14.211 7.14964 14.2806 7.21937ZM19.75 10C19.75 11.9284 19.1782 13.8134 18.1068 15.4168C17.0355 17.0202 15.5127 18.2699 13.7312 19.0078C11.9496 19.7458 9.98919 19.9389 8.09787 19.5627C6.20656 19.1865 4.46928 18.2579 3.10571 16.8943C1.74215 15.5307 0.813554 13.7934 0.437348 11.9021C0.061142 10.0108 0.254225 8.05042 0.992179 6.26884C1.73013 4.48726 2.97982 2.96451 4.58319 1.89317C6.18657 0.821828 8.07164 0.25 10 0.25C12.585 0.25273 15.0634 1.28084 16.8913 3.10872C18.7192 4.93661 19.7473 7.41498 19.75 10ZM18.25 10C18.25 8.3683 17.7661 6.77325 16.8596 5.41655C15.9531 4.05984 14.6646 3.00242 13.1571 2.37799C11.6497 1.75357 9.99085 1.59019 8.39051 1.90852C6.79017 2.22685 5.32016 3.01259 4.16637 4.16637C3.01259 5.32015 2.22685 6.79016 1.90853 8.3905C1.5902 9.99085 1.75358 11.6496 2.378 13.1571C3.00242 14.6646 4.05984 15.9531 5.41655 16.8596C6.77326 17.7661 8.36831 18.25 10 18.25C12.1873 18.2475 14.2843 17.3775 15.8309 15.8309C17.3775 14.2843 18.2475 12.1873 18.25 10Z"
                  fill="#F4F6F8"
                />
              </svg>
            ) : (
              <svg width={18} height={20} viewBox="0 0 18 20" fill="none">
                <path
                  d="M17.0306 5.71938L11.7806 0.469375C11.7109 0.399749 11.6282 0.344539 11.5371 0.306898C11.4461 0.269257 11.3485 0.249923 11.25 0.25H2.25C1.85218 0.25 1.47064 0.408035 1.18934 0.68934C0.908035 0.970645 0.75 1.35218 0.75 1.75V18.25C0.75 18.6478 0.908035 19.0294 1.18934 19.3107C1.47064 19.592 1.85218 19.75 2.25 19.75H15.75C16.1478 19.75 16.5294 19.592 16.8107 19.3107C17.092 19.0294 17.25 18.6478 17.25 18.25V6.25C17.2501 6.15148 17.2307 6.05391 17.1931 5.96286C17.1555 5.87182 17.1003 5.78908 17.0306 5.71938ZM12 2.81031L14.6897 5.5H12V2.81031ZM15.75 18.25H2.25V1.75H10.5V6.25C10.5 6.44891 10.579 6.63968 10.7197 6.78033C10.8603 6.92098 11.0511 7 11.25 7H15.75V18.25ZM11.7806 10.9694C11.8503 11.0391 11.9056 11.1218 11.9433 11.2128C11.981 11.3039 12.0004 11.4015 12.0004 11.5C12.0004 11.5985 11.981 11.6961 11.9433 11.7872C11.9056 11.8782 11.8503 11.9609 11.7806 12.0306C11.7109 12.1003 11.6282 12.1556 11.5372 12.1933C11.4461 12.231 11.3485 12.2504 11.25 12.2504C11.1515 12.2504 11.0539 12.231 10.9628 12.1933C10.8718 12.1556 10.7891 12.1003 10.7194 12.0306L9.75 11.0603V15.25C9.75 15.4489 9.67098 15.6397 9.53033 15.7803C9.38968 15.921 9.19891 16 9 16C8.80109 16 8.61032 15.921 8.46967 15.7803C8.32902 15.6397 8.25 15.4489 8.25 15.25V11.0603L7.28063 12.0306C7.21094 12.1003 7.12822 12.1556 7.03717 12.1933C6.94613 12.231 6.84855 12.2504 6.75 12.2504C6.65145 12.2504 6.55387 12.231 6.46283 12.1933C6.37178 12.1556 6.28906 12.1003 6.21937 12.0306C6.14969 11.9609 6.09442 11.8782 6.0567 11.7872C6.01899 11.6961 5.99958 11.5985 5.99958 11.5C5.99958 11.4015 6.01899 11.3039 6.0567 11.2128C6.09442 11.1218 6.14969 11.0391 6.21937 10.9694L8.46937 8.71937C8.53903 8.64964 8.62175 8.59432 8.71279 8.55658C8.80384 8.51884 8.90144 8.49941 9 8.49941C9.09856 8.49941 9.19616 8.51884 9.2872 8.55658C9.37825 8.59432 9.46097 8.64964 9.53063 8.71937L11.7806 10.9694Z"
                  fill="#959DB1"
                />
              </svg>
            )}
          </div>
          <Button
            color="secondary"
            onClick={() => {
              if (pickerRef && pickerRef.current) pickerRef.current.click();
            }}>
            Adicionar Certificado e-CNPJ A1
          </Button>
        </div>
        <div className="mt-4 w-full">
          <label htmlFor="CNPJ_A1_password" className="text-default mb-2 block text-sm font-medium">
            Senha do seu e-CNPJ A1
          </label>
          <Input
            value={a1Password}
            onChange={(e) => setA1Password(e.target.value)}
            id="CNPJ_A1_password"
            name="CNPJ_A1_password"
            type="password"
            autoComplete="off"
            autoCorrect="off"
            hidden
          />
        </div>
        <div className="mt-4 w-full">
          <label htmlFor="retype_CNPJ_A1_password" className="text-default mb-2 block text-sm font-medium">
            Confirme a senha do seu e-CNPJ A1
          </label>
          <Input
            value={retypeA1Password}
            onChange={(e) => setretypeA1Password(e.target.value)}
            id="retype_CNPJ_A1_password"
            name="retype_CNPJ_A1_password"
            type="password"
            autoComplete="off"
            autoCorrect="off"
            hidden
          />
          {a1Password !== retypeA1Password && retypeA1Password !== "" && (
            <p data-testid="required" className="py-2 text-xs text-red-500">
              As senhas precisam ser iguais.
            </p>
          )}
          {certificateRegistrationStatus && (
            <p data-testid="required" className="py-2 text-xs text-red-500">
              {certificateRegistrationStatus}
            </p>
          )}
        </div>
      </div>
      <fieldset className="mt-4">
        <p className="text-default mt-2 font-sans text-sm font-normal">
          Não se preocupe. Sua senha não será armazenada em nosso sistema. Ela será usada apenas para
          integração com a plataforma de emissão de notas fiscais.
        </p>
      </fieldset>
      <Button
        loading={isLoading}
        disabled={disabledButton}
        EndIcon="arrow-right"
        type="submit"
        className="mt-8 w-full items-center justify-center">
        Finalizar
      </Button>
    </form>
  );
};

export default AddCertificate;
