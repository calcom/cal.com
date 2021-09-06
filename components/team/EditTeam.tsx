import React, { useEffect, useState, useRef } from "react";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/outline";
import ErrorAlert from "@components/ui/alerts/Error";
import { UsernameInput } from "@components/ui/UsernameInput";
import MemberList from "./MemberList";
import Avatar from "@components/Avatar";
import ImageUploader from "@components/ImageUploader";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Modal from "@components/Modal";
import MemberInvitationModal from "@components/team/MemberInvitationModal";
import Button from "@components/ui/Button";
import { Member } from "@lib/member";
import { Team } from "@lib/team";

export default function EditTeam(props: { team: Team | undefined | null; onCloseEdit: () => void }) {
  const [members, setMembers] = useState([]);

  const nameRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const teamUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const descriptionRef = useRef<HTMLTextAreaElement>() as React.MutableRefObject<HTMLTextAreaElement>;
  const hideBrandingRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const logoRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const [hasErrors, setHasErrors] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [inviteModalTeam, setInviteModalTeam] = useState<Team | null | undefined>();
  const [errorMessage, setErrorMessage] = useState("");
  const [imageSrc, setImageSrc] = useState<string>("");

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
        setSuccessModalOpen(true);
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

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
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
            Back
          </Button>
        </div>
        <div className="">
          <div className="pb-5 pr-4 sm:pb-6">
            <h3 className="text-lg font-bold leading-6 text-gray-900">{props.team?.name}</h3>
            <div className="max-w-xl mt-2 text-sm text-gray-500">
              <p>Manage your team</p>
            </div>
          </div>
        </div>
        <hr className="mt-2" />
        <h3 className="font-bold leading-6 text-gray-900 mt-7 text-md">Profile</h3>
        <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateTeamHandler}>
          {hasErrors && <ErrorAlert message={errorMessage} />}
          <div className="py-6 lg:pb-8">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <div className="block sm:flex">
                  <div className="w-full mb-6 sm:w-1/2 sm:mr-2">
                    <UsernameInput ref={teamUrlRef} defaultValue={props.team?.slug} label={"My team URL"} />
                  </div>
                  <div className="w-full sm:w-1/2 sm:ml-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Team name
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      name="name"
                      id="name"
                      placeholder="Your team name"
                      required
                      className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                      defaultValue={props.team?.name}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                    About
                  </label>
                  <div className="mt-1">
                    <textarea
                      ref={descriptionRef}
                      id="about"
                      name="about"
                      rows={3}
                      defaultValue={props.team?.bio}
                      className="block w-full mt-1 border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"></textarea>
                    <p className="mt-2 text-sm text-gray-500">
                      A few sentences about your team. This will appear on your team&apos;s URL page.
                    </p>
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
                      defaultValue={imageSrc ? imageSrc : props.team?.logo}
                    />
                    <ImageUploader
                      target="logo"
                      id="logo-upload"
                      buttonMsg={imageSrc !== "" ? "Edit logo" : "Upload a logo"}
                      handleAvatarChange={handleLogoChange}
                      imageRef={imageSrc ? imageSrc : props.team?.logo}
                    />
                  </div>
                  <hr className="mt-6" />
                </div>
                <div className="flex justify-between mt-7">
                  <h3 className="font-bold leading-6 text-gray-900 text-md">Members</h3>
                  <div className="relative flex items-center">
                    <Button
                      type="button"
                      color="secondary"
                      StartIcon={PlusIcon}
                      onClick={() => onInviteMember(props.team)}>
                      New Member
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
                        Disable Calendso branding
                      </label>
                      <p className="text-gray-500">Hide all Calendso branding from your public pages.</p>
                    </div>
                  </div>
                  <hr className="mt-6" />
                </div>
                <h3 className="font-bold leading-6 text-gray-900 mt-7 text-md">Danger Zone</h3>
                <div>
                  <div className="relative flex items-start">
                    <Dialog>
                      <DialogTrigger
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="btn-sm btn-white">
                        <TrashIcon className="group-hover:text-red text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />
                        Disband Team
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        variety="danger"
                        title="Disband Team"
                        confirmBtnText="Yes, disband team"
                        cancelBtnText="Cancel"
                        onConfirm={() => deleteTeam()}>
                        Are you sure you want to disband this team? Anyone who you&apos;ve shared this team
                        link with will no longer be able to book using it.
                      </ConfirmationDialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
            <hr className="mt-8" />
            <div className="flex justify-end py-4">
              <Button type="submit" color="primary">
                Save
              </Button>
            </div>
          </div>
        </form>
        <Modal
          heading="Team updated successfully"
          description="Your team has been updated successfully."
          open={successModalOpen}
          handleClose={closeSuccessModal}
        />
        {showMemberInvitationModal && (
          <MemberInvitationModal team={inviteModalTeam} onExit={onMemberInvitationModalExit} />
        )}
      </div>
    </div>
  );
}
