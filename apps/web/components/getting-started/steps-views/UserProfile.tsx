import { ArrowRightIcon } from "@heroicons/react/solid";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { FormEvent, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { User } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Button, Input } from "@calcom/ui/v2";

import { AvatarSSR } from "@components/ui/AvatarSSR";
import ImageUploader from "@components/v2/settings/ImageUploader";

interface IUserProfile {
  user?: User;
}

type FormData = {
  bio: string;
};

const UserProfile = (props: IUserProfile) => {
  const { user } = props;
  const { t } = useTranslation();
  const avatarRef = useRef<HTMLInputElement>(null!);
  const bioRef = useRef<HTMLInputElement>(null);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { bio: user?.bio || "" } });

  const [imageSrc, setImageSrc] = useState<string>(user?.avatar || "");
  const utils = trpc.useContext();
  const router = useRouter();
  const onSuccess = async () => {
    await utils.invalidateQueries(["viewer.me"]);
    router.push("/");
  };
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: onSuccess,
  });
  const onSubmit = handleSubmit((data) => {
    const { bio } = data;

    mutation.mutate({
      bio,
      completedOnboarding: true,
    });
  });

  async function updateProfileHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredAvatar = avatarRef.current.value;
    mutation.mutate({
      avatar: enteredAvatar,
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="font-cal text-sm">{t("profile_picture")}</p>
      <div className="mt-4 flex flex-row items-center justify-start rtl:justify-end">
        {user && <AvatarSSR user={user} alt="Profile picture" className="h-16 w-16" />}
        <input
          ref={avatarRef}
          type="hidden"
          name="avatar"
          id="avatar"
          placeholder="URL"
          className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-neutral-800 focus:outline-none focus:ring-neutral-800"
          defaultValue={imageSrc}
        />
        <div className="flex items-center px-4">
          <ImageUploader
            target="avatar"
            id="avatar-upload"
            buttonMsg={t("upload")}
            handleAvatarChange={(newAvatar) => {
              avatarRef.current.value = newAvatar;
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              )?.set;
              nativeInputValueSetter?.call(avatarRef.current, newAvatar);
              const ev2 = new Event("input", { bubbles: true });
              avatarRef.current.dispatchEvent(ev2);
              updateProfileHandler(ev2 as unknown as FormEvent<HTMLFormElement>);
              setImageSrc(newAvatar);
            }}
            imageSrc={imageSrc}
          />
        </div>
      </div>
      <fieldset className="mt-8">
        <label htmlFor="bio" className="mb-2 block text-sm font-medium text-gray-700">
          {t("about")}
        </label>
        <Input
          {...register("bio", { required: true })}
          ref={bioRef}
          type="text"
          name="bio"
          id="bio"
          className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          defaultValue={user?.bio || undefined}
          onChange={(event) => {
            setValue("bio", event.target.value);
          }}
        />
        {errors.bio && <p className="text-xs italic text-red-500">{t("required")}</p>}
        <p className="mt-2 text-sm font-normal text-gray-600 dark:text-white">
          {t("few_sentences_about_yourself")}
        </p>
      </fieldset>
      <Button
        type="submit"
        className="mt-11 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-sm text-white">
        Finish
        <ArrowRightIcon className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};
export default UserProfile;
