import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Input, showToast } from "@calcom/ui";

type FormData = {
  bio: string;
};

const AddCertificate = () => {
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const pickerRef = useRef<any>(null);
  const { handleSubmit } = useForm<FormData>({
    defaultValues: { bio: user?.bio || "" },
  });

  const [a1Src, setA1Src] = useState<string>();
  const [a1Password, setA1Password] = useState<string>("");
  const [retypeA1Password, setretypeA1Password] = useState<string>("");
  const utils = trpc.useUtils();
  const router = useRouter();

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (_data) => {
      await utils.viewer.me.refetch();
      const redirectUrl = localStorage.getItem("onBoardingRedirect");
      localStorage.removeItem("onBoardingRedirect");
      redirectUrl ? router.push(redirectUrl) : router.push("/");
    },
    onError: () => {
      showToast(t("problem_saving_user_profile"), "error");
    },
  });
  const onSubmit = handleSubmit((data: { bio: string }) => {
    // const { bio } = data;
    // telemetry.event(telemetryEventTypes.onboardingFinished);
    // mutation.mutate({
    //   bio,
    //   completedOnboarding: true,
    // });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col items-center justify-start rtl:justify-end">
        <div className="flex w-full flex-row items-center">
          <input
            type="file"
            id="CNPJ_A1"
            name="CNPJ_A1"
            ref={pickerRef}
            className="hidden"
            onChange={(event) => {
              setA1Src(event.target.value);
            }}
          />
          <div
            className={
              `mr-2 flex h-16 w-16 items-center justify-center ${a1Src}` ? "bg-[#06C6A3]" : "bg-[#E5E7EB]"
            }
          />
          <Button
            color="secondary"
            onClick={() => {
              pickerRef?.current.click();
            }}>
            Adicionar Certificado e-CNPJ A1
          </Button>
        </div>
        {/* <div className="flex items-center px-4">
          <ImageUploader
            target="avatar"
            id="avatar-upload"
            buttonMsg={t("add_profile_photo")}
            handleAvatarChange={(newAvatar) => {
              if (avatarRef.current) {
                avatarRef.current.value = newAvatar;
              }
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              )?.set;
              nativeInputValueSetter?.call(avatarRef.current, newAvatar);
              const ev2 = new Event("input", { bubbles: true });
              avatarRef.current?.dispatchEvent(ev2);
              updateProfileHandler(ev2 as unknown as FormEvent<HTMLFormElement>);
              setImageSrc(newAvatar);
            }}
            imageSrc={imageSrc}
          />
        </div>
      */}
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
        </div>
      </div>
      <fieldset className="mt-4">
        <p className="text-default mt-2 font-sans text-sm font-normal">
          Fique tranquilo! Nós não iremos armazenar a sua senha. Ela será utilizada somente para integrar à
          plataforma de emissão de notas fiscais e será excluída automaticamente em seguida.
        </p>
      </fieldset>
      <Button
        loading={mutation.isPending}
        EndIcon="arrow-right"
        type="submit"
        className="mt-8 w-full items-center justify-center">
        Finalizar
      </Button>
    </form>
  );
};

export default AddCertificate;
