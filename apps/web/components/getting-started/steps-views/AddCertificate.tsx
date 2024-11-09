import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon, Input, showToast } from "@calcom/ui";

type FormData = {
  bio: string;
};

const AddCertificate = () => {
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const { setValue, handleSubmit, getValues } = useForm<FormData>({
    defaultValues: { bio: user?.bio || "" },
  });

  const [imageSrc, setImageSrc] = useState<string>(user?.avatar || "");
  const utils = trpc.useUtils();
  const router = useRouter();
  const telemetry = useTelemetry();

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
      <div className="flex flex-row items-center justify-start rtl:justify-end">
        {/* {user && <UserAvatar size="lg" user={user} previewSrc={imageSrc} />}
        <input
          ref={avatarRef}
          type="hidden"
          name="avatar"
          id="avatar"
          placeholder="URL"
          className="border-default focus:ring-empthasis mt-1 block w-full rounded-sm border px-3 py-2 text-sm focus:border-gray-800 focus:outline-none"
          defaultValue={imageSrc}
        /> */}
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
        <div className="w-full">
          <label htmlFor="CNPJ_A1_password" className="text-default mb-2 block text-sm font-medium">
            Senha do seu e-CNPJ A1
          </label>
          <Input
            // {...register("name", {
            //   required: true,
            // })}
            id="CNPJ_A1_password"
            name="CNPJ_A1_password"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            hidden
          />
        </div>
        <div className="w-full">
          <label htmlFor="retype_CNPJ_A1_password" className="text-default mb-2 block text-sm font-medium">
            Confirme a senha do seu e-CNPJ A1
          </label>
          <Input
            // {...register("name", {
            //   required: true,
            // })}
            id="retype_CNPJ_A1_password"
            name="retype_CNPJ_A1_password"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            hidden
          />
          {/* {errors.name && (
            <p data-testid="required" className="py-2 text-xs text-red-500">
              As senhas precisam ser iguais.
            </p>
          )} */}
        </div>
      </div>
      <fieldset className="mt-8">
        {/* <Label className="text-default mb-2 block text-sm font-medium">{t("about")}</Label>
        <Editor
          getText={() => md.render(getValues("bio") || user?.bio || "")}
          setText={(value: string) => setValue("bio", turndown(value))}
          excludedToolbarItems={["blockType"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        /> */}
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
        <Icon name="arrow-right" className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export default AddCertificate;
