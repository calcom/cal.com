import { HashtagIcon, InformationCircleIcon, LinkIcon, PhotographIcon } from "@heroicons/react/solid";
import React, { useRef, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { TeamWithMembers } from "@lib/queries/teams";
import { trpc } from "@lib/trpc";

import ImageUploader from "@components/ImageUploader";
import { TextField } from "@components/form/fields";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";
import SettingInputContainer from "@components/ui/SettingInputContainer";

interface Props {
  team: TeamWithMembers | null | undefined;
}

export default function TeamSettings(props: Props) {
  const { t } = useLocale();

  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const team = props.team;
  const hasLogo = !!team?.logo;

  const utils = trpc.useContext();
  const mutation = trpc.useMutation("viewer.teams.update", {
    onError: (err) => {
      setHasErrors(true);
      setErrorMessage(err.message);
    },
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      showToast(t("your_team_updated_successfully"), "success");
      setHasErrors(false);
    },
  });

  const nameRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const teamUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const descriptionRef = useRef<HTMLTextAreaElement>() as React.MutableRefObject<HTMLTextAreaElement>;
  const hideBrandingRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const logoRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  function updateTeamData() {
    if (!team) return;
    const variables = {
      name: nameRef.current?.value,
      slug: teamUrlRef.current?.value,
      bio: descriptionRef.current?.value,
      hideBranding: hideBrandingRef.current?.checked,
    };
    // remove unchanged variables
    for (const key in variables) {
      if (variables[key] === team?.[key]) delete variables[key];
    }
    mutation.mutate({ id: team.id, ...variables });
  }

  function updateLogo(newLogo: string) {
    if (!team) return;
    logoRef.current.value = newLogo;
    mutation.mutate({ id: team.id, logo: newLogo });
  }

  const removeLogo = () => updateLogo("");

  return (
    <div className="divide-y divide-gray-200 lg:col-span-9">
      <div className="">
        {hasErrors && <Alert severity="error" title={errorMessage} />}
        <form
          className="divide-y divide-gray-200 lg:col-span-9"
          onSubmit={(e) => {
            e.preventDefault();
            updateTeamData();
          }}>
          <div className="py-6">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <SettingInputContainer
                  Icon={LinkIcon}
                  label="Team URL"
                  htmlFor="team-url"
                  Input={
                    <TextField
                      name="" // typescript requires name but we don't want component to render name label
                      id="team-url"
                      addOnLeading={
                        <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                          {process.env.NEXT_PUBLIC_APP_URL}/{"team/"}
                        </span>
                      }
                      ref={teamUrlRef}
                      defaultValue={team?.slug as string}
                    />
                  }
                />
                <SettingInputContainer
                  Icon={HashtagIcon}
                  label="Team Name"
                  htmlFor="name"
                  Input={
                    <input
                      ref={nameRef}
                      type="text"
                      name="name"
                      id="name"
                      placeholder={t("your_team_name")}
                      required
                      className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-neutral-800 sm:text-sm"
                      defaultValue={team?.name as string}
                    />
                  }
                />
                <hr />
                <div>
                  <SettingInputContainer
                    Icon={InformationCircleIcon}
                    label={t("about")}
                    htmlFor="about"
                    Input={
                      <>
                        <textarea
                          ref={descriptionRef}
                          id="about"
                          name="about"
                          rows={3}
                          defaultValue={team?.bio as string}
                          className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"></textarea>
                        <p className="mt-2 text-sm text-gray-500">{t("team_description")}</p>
                      </>
                    }
                  />
                </div>
                <div>
                  <SettingInputContainer
                    Icon={PhotographIcon}
                    label={"Logo"}
                    htmlFor="avatar"
                    Input={
                      <>
                        <div className="mt-1 flex">
                          <input
                            ref={logoRef}
                            type="hidden"
                            name="avatar"
                            id="avatar"
                            placeholder="URL"
                            className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-neutral-800 sm:text-sm"
                            defaultValue={team?.logo ?? undefined}
                          />
                          <ImageUploader
                            target="logo"
                            id="logo-upload"
                            buttonMsg={hasLogo ? t("edit_logo") : t("upload_a_logo")}
                            handleAvatarChange={updateLogo}
                            imageSrc={team?.logo ?? undefined}
                          />
                          {hasLogo && (
                            <Button
                              onClick={removeLogo}
                              color="secondary"
                              type="button"
                              className="ml-1 py-1 text-xs">
                              {t("remove_logo")}
                            </Button>
                          )}
                        </div>
                      </>
                    }
                  />

                  <hr className="mt-6" />
                </div>

                <div className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id="hide-branding"
                      name="hide-branding"
                      type="checkbox"
                      ref={hideBrandingRef}
                      defaultChecked={team?.hideBranding}
                      className="h-4 w-4 rounded-sm border-gray-300 text-neutral-900 focus:ring-neutral-500"
                    />
                  </div>
                  <div className="text-sm ltr:ml-3 rtl:mr-3">
                    <label htmlFor="hide-branding" className="font-medium text-gray-700">
                      {t("disable_cal_branding")}
                    </label>
                    <p className="text-gray-500">{t("disable_cal_branding_description")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end py-4">
            <Button type="submit" color="primary">
              {t("save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
