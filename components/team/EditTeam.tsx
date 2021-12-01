import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/outline";
import React, { useEffect, useRef, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { Member } from "@lib/member";
import showToast from "@lib/notification";
import { Team } from "@lib/team";

import { Dialog, DialogTrigger } from "@components/Dialog";
import ImageUploader from "@components/ImageUploader";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import MemberInvitationModal from "@components/team/MemberInvitationModal";
import Avatar from "@components/ui/Avatar";
import Button from "@components/ui/Button";
import { UsernameInput } from "@components/ui/UsernameInput";
import ErrorAlert from "@components/ui/alerts/Error";

import MemberList from "./MemberList";

export default function EditTeam(props: { team: Team | undefined | null; onCloseEdit: () => void }) {
  const [members, setMembers] = useState([]);

  const nameRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const teamUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const descriptionRef = useRef<HTMLTextAreaElement>() as React.MutableRefObject<HTMLTextAreaElement>;
  const hideBrandingRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const logoRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const [hasErrors, setHasErrors] = useState(false);
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [inviteModalTeam, setInviteModalTeam] = useState<Team | null | undefined>();
  const [errorMessage, setErrorMessage] = useState("");
  const [imageSrc, setImageSrc] = useState<string>("");
  const { t } = useLocale();

  const loadMembers = () =>
    fetch("/api/teams/" + props.team?.id + "/membership")
      .then((res) => res.json())
      .then((data) => setMembers(data.members));

  useEffect(() => {
    loadMembers();
  }, []);

  const deleteTeam = () => {
    return fetch("/api/teams/" + props.team?.id, {
      method: "DELETE",
    }).then(props.onCloseEdit());
  };

  const onRemoveMember = (member: Member) => {
    return fetch("/api/teams/" + props.team?.id + "/membership", {
      method: "DELETE",
      body: JSON.stringify({ userId: member.id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(loadMembers);
  };

  const onInviteMember = (team: Team | null | undefined) => {
    setShowMemberInvitationModal(true);
    setInviteModalTeam(team);
  };

  const handleError = async (resp: Response) => {
    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.message);
    }
  };

  async function updateTeamHandler(event) {
    event.preventDefault();

    const enteredUsername = teamUrlRef?.current?.value.toLowerCase();
    const enteredName = nameRef?.current?.value;
    const enteredDescription = descriptionRef?.current?.value;
    const enteredLogo = logoRef?.current?.value;
    const enteredHideBranding = hideBrandingRef?.current?.checked;

    // TODO: Add validation

    await fetch("/api/teams/" + props.team?.id + "/profile", {
      method: "PATCH",
      body: JSON.stringify({
        username: enteredUsername,
        name: enteredName,
        description: enteredDescription,
        logo: enteredLogo,
        hideBranding: enteredHideBranding,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(handleError)
      .then(() => {
        showToast(t("your_team_updated_successfully"), "success");
        setHasErrors(false); // dismiss any open errors
      })
      .catch((err) => {
        setHasErrors(true);
        setErrorMessage(err.message);
      });
  }

  const onMemberInvitationModalExit = () => {
    loadMembers();
    setShowMemberInvitationModal(false);
  };

  const handleLogoChange = (newLogo: string) => {
    logoRef.current.value = newLogo;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement?.prototype, "value").set;
    nativeInputValueSetter?.call(logoRef.current, newLogo);
    const ev2 = new Event("input", { bubbles: true });
    logoRef?.current?.dispatchEvent(ev2);
    updateTeamHandler(ev2);
    setImageSrc(newLogo);
  };

  return (
    <div className="divide-y divide-gray-200 lg:col-span-9">
      <div className="py-6 lg:pb-8">
        <div className="mb-4">
          <Button
            type="button"
            color="secondary"
            size="sm"
            StartIcon={ArrowLeftIcon}
            onClick={() => props.onCloseEdit()}>
            {t("back")}
          </Button>
        </div>
        <div>
          <div className="pb-5 pr-4 sm:pb-6">
            <h3 className="text-lg font-bold leading-6 text-gray-900">{props.team?.name}</h3>
            <div className="max-w-xl mt-2 text-sm text-gray-500">
              <p>{t("manage_your_team")}</p>
            </div>
          </div>
        </div>
        <hr className="mt-2" />
        <h3 className="font-bold leading-6 text-gray-900 font-cal mt-7 text-md">{t("profile")}</h3>
        <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateTeamHandler}>
          {hasErrors && <ErrorAlert message={errorMessage} />}
          <div className="py-6 lg:pb-8">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <div className="block sm:flex">
                  <div className="w-full mb-6 sm:w-1/2 sm:mr-2">
                    <UsernameInput
                      ref={teamUrlRef}
                      defaultValue={props.team?.slug}
                      label={t("my_team_url")}
                    />
                  </div>
                  <div className="w-full sm:w-1/2 sm:ml-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      {t("team_name")}
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      name="name"
                      id="name"
                      placeholder={t("your_team_name")}
                      required
                      className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                      defaultValue={props.team?.name}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                    {t("about")}
                  </label>
                  <div className="mt-1">
                    <textarea
                      ref={descriptionRef}
                      id="about"
                      name="about"
                      rows={3}
                      defaultValue={props.team?.bio}
                      className="block w-full mt-1 border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"></textarea>
                    <p className="mt-2 text-sm text-gray-500">{t("team_description")}</p>
                  </div>
                </div>
                <div>
                  <div className="flex mt-1">
                    <Avatar
                      className="relative w-10 h-10 rounded-full"
                      imageSrc={imageSrc ? imageSrc : props.team?.logo}
                      displayName="Logo"
                    />
                    <input
                      ref={logoRef}
                      type="hidden"
                      name="avatar"
                      id="avatar"
                      placeholder="URL"
                      className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                      defaultValue={imageSrc ?? props.team?.logo}
                    />
                    <ImageUploader
                      target="logo"
                      id="logo-upload"
                      buttonMsg={imageSrc !== "" ? t("edit_logo") : t("upload_a_logo")}
                      handleAvatarChange={handleLogoChange}
                      imageSrc={imageSrc ?? props.team?.logo}
                    />
                  </div>
                  <hr className="mt-6" />
                </div>
                <div className="flex justify-between mt-7">
                  <h3 className="font-bold leading-6 text-gray-900 font-cal text-md">{t("members")}</h3>
                  <div className="relative flex items-center">
                    <Button
                      type="button"
                      color="secondary"
                      StartIcon={PlusIcon}
                      onClick={() => onInviteMember(props.team)}>
                      {t("new_member")}
                    </Button>
                  </div>
                </div>
                <div>
                  {!!members.length && (
                    <MemberList members={members} onRemoveMember={onRemoveMember} onChange={loadMembers} />
                  )}
                  <hr className="mt-6" />
                </div>
                <div>
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="hide-branding"
                        name="hide-branding"
                        type="checkbox"
                        ref={hideBrandingRef}
                        defaultChecked={props.team?.hideBranding}
                        className="w-4 h-4 border-gray-300 rounded-sm focus:ring-neutral-500 text-neutral-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="hide-branding" className="font-medium text-gray-700">
                        {t("disable_cal_branding")}
                      </label>
                      <p className="text-gray-500">{t("disable_cal_branding_description")}</p>
                    </div>
                  </div>
                  <hr className="mt-6" />
                </div>
                <h3 className="font-bold leading-6 text-gray-900 mt-7 text-md">{t("danger_zone")}</h3>
                <div>
                  <div className="relative flex items-start">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" color="secondary" StartIcon={TrashIcon}>
                          {t("disband_team")}
                        </Button>
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        variety="danger"
                        title={t("disband_team")}
                        confirmBtnText={t("confirm_disband_team")}
                        onConfirm={() => deleteTeam()}>
                        {t("disband_team_confirmation_message")}
                      </ConfirmationDialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
            <hr className="mt-8" />
            <div className="flex justify-end py-4">
              <Button type="submit" color="primary">
                {t("save")}
              </Button>
            </div>
          </div>
        </form>
        {showMemberInvitationModal && (
          <MemberInvitationModal team={inviteModalTeam} onExit={onMemberInvitationModalExit} />
        )}
      </div>
    </div>
  );
}
