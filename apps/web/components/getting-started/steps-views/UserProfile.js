import { Button as Xbutton } from "@shadcdn/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import OrganizationAvatar from "@calcom/features/ee/organizations/components/OrganizationAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import { Button, Editor, ImageUploader, Label, showToast, Select, Input } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";
import { X, Plus } from "@calcom/ui/components/icon";

import { chargeOptions } from "@lib/firebase/constants";

const UserProfile = () => {
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const avatarRef = useRef(null);
  const {
    setValue,
    control,
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: { bio: user?.bio || "", advises: [""] },
  });

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: "advises",
  });

  useEffect(() => {
    setValue("advises", [""]);
  }, []);

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const [imageSrc, setImageSrc] = useState(user?.avatar || "");
  const utils = trpc.useContext();
  const router = useRouter();
  const createEventType = trpc.viewer.eventTypes.create.useMutation();
  const telemetry = useTelemetry();
  const [firstRender, setFirstRender] = useState(true);

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (_data, context) => {
      if (context.avatar) {
        showToast(t("your_user_profile_updated_successfully"), "success");
        await utils.viewer.me.refetch();
      } else {
        try {
          if (eventTypes?.length === 0) {
            await Promise.all(
              DEFAULT_EVENT_TYPES.map(async (event) => {
                return createEventType.mutate(event);
              })
            );
          }
        } catch (error) {
          console.error(error);
        }

        await utils.viewer.me.refetch();
        router.push(`/${user?.username}`);
      }
    },
    onError: () => {
      showToast(t("problem_saving_user_profile"), "error");
    },
  });
  const onSubmit = handleSubmit((data) => {
    if (!data?.advises?.length) {
      setError("advises", { type: "custom", message: "This field is required" });
      return;
    }

    const { bio } = data;

    telemetry.event(telemetryEventTypes.onboardingFinished);

    mutation.mutate({
      bio,
      completedOnboarding: true,
    });
  });

  async function updateProfileHandler(event) {
    event.preventDefault();
    const enteredAvatar = avatarRef.current?.value;
    mutation.mutate({
      avatar: enteredAvatar,
    });
  }

  const DEFAULT_EVENT_TYPES = [
    {
      title: t("15min_meeting"),
      slug: "15min",
      length: 15,
    },
    {
      title: t("30min_meeting"),
      slug: "30min",
      length: 30,
    },
    {
      title: t("secret_meeting"),
      slug: "secret",
      length: 15,
      hidden: true,
    },
  ];

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-row items-center justify-start rtl:justify-end">
        {user && (
          <OrganizationAvatar
            alt={user.username || "user avatar"}
            size="lg"
            imageSrc={imageSrc}
            organizationSlug={user.organization?.slug}
          />
        )}
        <input
          ref={avatarRef}
          type="hidden"
          name="avatar"
          id="avatar"
          placeholder="URL"
          className="border-default focus:ring-empthasis mt-1 block w-full rounded-sm border px-3 py-2 text-sm focus:border-gray-800 focus:outline-none"
          defaultValue={imageSrc}
        />
        <div className="flex items-center px-4">
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
              updateProfileHandler(ev2);
              setImageSrc(newAvatar);
            }}
            imageSrc={imageSrc}
          />
        </div>
      </div>
      <fieldset className="mt-8">
        <Label className="text-default mb-2 block text-sm font-medium">{t("about")}</Label>
        <Editor
          getText={() => md.render(getValues("bio") || user?.bio || "")}
          setText={(value) => setValue("bio", turndown(value))}
          excludedToolbarItems={["blockType"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
        <p className="dark:text-inverted text-default mt-2 font-sans text-sm font-normal">
          {t("few_sentences_about_yourself")}
        </p>
      </fieldset>
      <fieldset className="mb-3">
        <Label className="mb-2 mt-8">Call charges</Label>
        <Select
          required
          isSearchable={false}
          className="mb-0 h-[38px] w-full capitalize md:min-w-[150px] md:max-w-[200px]"
          // defaultValue={durationTypeOptions.find(
          //   (option) => option.value === minimumBookingNoticeDisplayValues.type
          // )}
          // onChange={(input) => {
          //   if (input) {
          //     setMinimumBookingNoticeDisplayValues({
          //       ...minimumBookingNoticeDisplayValues,
          //       type: input.value,
          //     });
          //   }
          // }}
          options={chargeOptions?.map((item) => ({ label: `$${item.value}`, value: item.priceIdProd }))}
        />
        <p className="dark:text-inverted text-default mt-2 font-sans text-sm font-normal">
          How much would you like to charge per hour?
        </p>
      </fieldset>
      {/* Things you can advise on */}
      <div className="mt-8 w-full">
        <div className="mb-2 flex items-center gap-x-2">
          <Label className="mb-0" htmlFor="advises">
            Things you can advice on
          </Label>
          <Xbutton
            type="button"
            size="sm"
            className="h-auto px-2"
            variant="outline"
            onClick={() => prepend("")}>
            <Plus size={12} className="mr-px" />
            Add
          </Xbutton>
        </div>

        <div className="flex flex-col gap-y-2">
          {fields.map((item, index) => (
            <section key={item.id} className="flex flex-col">
              <div className="flex items-center gap-2">
                <Input
                  className="border-default mb-0 w-full rounded-md border text-sm"
                  placeholder="Enter your expertise"
                  {...register(`advises.${index}`, {
                    required: true,
                  })}
                />

                <Xbutton variant="outline" onClick={() => remove(index)}>
                  <X size={12} />
                </Xbutton>
              </div>
            </section>
          ))}
          {console.log({ errors })}
          {errors?.advises?.length || errors?.advises?.message ? (
            <p data-testid="required" className="text-xs text-red-500">
              This field is required
            </p>
          ) : (
            ""
          )}
        </div>
      </div>
      <Button
        type="submit"
        className="text-inverted mt-8 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-sm">
        {t("finish")}
        <ArrowRight className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export default UserProfile;
