import { useEffect, useState, useRef } from "react";
import { ArrowLeftIcon, PlusIcon, TrashIcon, UserRemoveIcon, UsersIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/client";
import ErrorAlert from "@components/ui/alerts/Error";
import { UsernameInput } from "@components/ui/UsernameInput";
import MemberList from "./MemberList";
import Avatar from "@components/Avatar";
import ImageUploader from "@components/ImageUploader";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";

export default function EditTeam(props: any) {
  const [session] = useSession();
  const [members, setMembers] = useState([]);

  const nameRef = useRef<HTMLInputElement>();
  const teamUrlRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLInputElement>();
  const hideBrandingRef = useRef<HTMLInputElement>();
  const usernameRef = useRef<HTMLInputElement>();
  const avatarRef = useRef<HTMLInputElement>();
  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageSrc, setImageSrc] = useState<string>("");

  const loadMembers = () =>
    fetch("/api/teams/" + props.team.id + "/membership")
      .then((res: any) => res.json())
      .then((data) => setMembers(data.members));

  useEffect(() => {
    loadMembers();
  }, []);

  const deleteTeam = () => {
    return fetch("/api/teams/" + props.team.id, {
      method: "DELETE",
    })
    .then(props.onCloseEdit());
  };

  const onRemoveMember = (member: any) => {
    return fetch("/api/teams/" + props.team.id + "/membership", {
      method: "DELETE",
      body: JSON.stringify({ userId: member.id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(loadMembers);
  };

  const updateTeamHandler = () => {
    //   TODO :: UPDATE TEAM HANDLER
  }

  const handleAvatarChange = () => {
      console.log('logo changed')
  }

  return (
      
      <div className="divide-y divide-gray-200 lg:col-span-9">

        <div className="py-6 lg:pb-8">
            <div className="mb-4">
                <button onClick={() => props.onCloseEdit()} className="btn-sm btn-white">
                    <ArrowLeftIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" /> Back
                </button>
            </div>
            <div className="">
                <div className="pr-4 pb-5 sm:pb-6">
                    <h3 className="text-lg leading-6 font-bold text-gray-900">
                        {props.team.name}
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>Manage your team</p>
                    </div>
                </div>
            </div>
            <hr className="mt-2" />
            <h3 className="mt-7 text-md leading-6 font-bold text-gray-900">
                Profile
            </h3>
            <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateTeamHandler}>
                {hasErrors && <ErrorAlert message={errorMessage} />}
                <div className="py-6 lg:pb-8">
                    <div className="flex flex-col lg:flex-row">
                        <div className="flex-grow space-y-6">
                            <div className="block sm:flex">
                                <div className="w-full sm:w-1/2 sm:mr-2 mb-6">
                                    <UsernameInput ref={usernameRef} defaultValue={props.team.slug} />
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
                                        className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                                        defaultValue={props.team.name}
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
                                    placeholder="A little something about your team."
                                    rows={3}
                                    // defaultValue={props.team.bio}
                                    className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-sm"></textarea>
                                </div>
                            </div>
                            <div>
                                <div className="mt-1 flex">
                                    {console.log(props.team)}
                                    <Avatar
                                    className="relative rounded-full w-10 h-10"
                                    imageSrc={imageSrc ? imageSrc : props.team.logo}
                                    displayName="Logo"
                                    />
                                    <input
                                    ref={avatarRef}
                                    type="hidden"
                                    name="avatar"
                                    id="avatar"
                                    placeholder="URL"
                                    className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                                    defaultValue={imageSrc ? imageSrc : props.team.logo}
                                    />                    
                                    <ImageUploader 
                                    target="logo"
                                    id="logo-upload"
                                    buttonMsg="Change logo"
                                    handleAvatarChange={handleAvatarChange}
                                    imageRef={imageSrc ? imageSrc : props.team.logo}
                                    />
                                </div>
                                <hr className="mt-6" />
                            </div>  
                            <div className="flex justify-between mt-7">
                                <h3 className="text-md leading-6 font-bold text-gray-900">
                                    Member
                                </h3>
                                <div className="relative flex items-center">
                                    <button type="button" onClick={() => props.onInviteMember(props.team)} className="btn-sm btn-white">
                                    <PlusIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />Invite Member
                                    </button>
                                </div>
                            </div>
                            <div>
                                {!!members.length && <MemberList members={members} onRemoveMember={onRemoveMember} onChange={loadMembers} />}
                                <hr className="mt-6" />
                            </div>                                          
                            <h3 className="mt-7 text-md leading-6 font-bold text-gray-900">
                                Branding
                            </h3>
                            <div>
                                <div className="relative flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                        id="hide-branding"
                                        name="hide-branding"
                                        type="checkbox"
                                        ref={hideBrandingRef}
                                        // defaultChecked={props.team.hideBranding}
                                        className="focus:ring-neutral-500 h-4 w-4 text-neutral-900 border-gray-300 rounded-sm"
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
                            <h3 className="mt-7 text-md leading-6 font-bold text-gray-900">
                                Danger Zone
                            </h3>
                            <div>
                                <div className="relative flex items-start">
                                <Dialog>
                                    <DialogTrigger onClick={(e)=>{e.stopPropagation();}} className="btn-sm btn-white">
                                        <TrashIcon className="group-hover:text-red text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />
                                        Disband Team                          
                                    </DialogTrigger>
                                    <ConfirmationDialogContent
                                        alert="danger"
                                        title="Disband Team"
                                        confirmBtnText="Yes, disband team"
                                        cancelBtnText = "Cancel"
                                        onConfirm={() => deleteTeam()}>
                                        Are you sure you want to disband this team? Anyone who you&apos;ve shared this team link
                                        with will no longer be able to book using it.
                                    </ConfirmationDialogContent>
                                </Dialog>
                                </div>
                            </div>                            
                        </div>
                    </div>
                    <hr className="mt-8" />
                    <div className="py-4 flex justify-end">
                        <button
                        type="submit"
                        className="ml-2 bg-neutral-900 border border-transparent rounded-sm shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500">
                        Save
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

  );
}
