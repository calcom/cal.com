import { useEffect, useState, useRef } from "react";
import { ArrowLeftIcon, UserRemoveIcon, UsersIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/client";
import Link from "next/link";
import ErrorAlert from "../../components/ui/alerts/Error";
import { UsernameInput } from "@components/ui/UsernameInput";

export default function EditTeam(props) {
  const [session] = useSession();
  const [members, setMembers] = useState([]);
  const [checkedDisbandTeam, setCheckedDisbandTeam] = useState(false);

  const nameRef = useRef<HTMLInputElement>();
  const teamUrlRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLInputElement>();
  const hideBrandingRef = useRef<HTMLInputElement>();
  const usernameRef = useRef<HTMLInputElement>();
  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMembers = () =>
    fetch("/api/teams/" + props.team.id + "/membership")
      .then((res: any) => res.json())
      .then((data) => setMembers(data.members));

  useEffect(() => {
    loadMembers();
  }, []);

  const deleteTeam = (e) => {
    e.preventDefault();
    return fetch("/api/teams/" + props.team.id, {
      method: "DELETE",
    }).then(props.onExit);
  };

  const removeMember = (member) => {
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

  return (
      <div className="divide-y divide-gray-200 lg:col-span-9">

        <div className="py-6 lg:pb-8">
            <div className="flex">
                <div className="">
                    <a href={`/settings/teams`} >
                        <button className="flex items-center px-4 py-2 w-full text-left">
                            <ArrowLeftIcon className="group-hover:text-black text-gray-700 w-6 h-6 inline-block" />
                        </button>
                    </a>                
                </div>
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
                                    {/* <Avatar
                                    user={props.user}
                                    className="relative rounded-full w-10 h-10"
                                    fallback={<div className="relative bg-neutral-900 rounded-full w-10 h-10"></div>}
                                    imageSrc={imageSrc}
                                    />
                                    <input
                                    ref={avatarRef}
                                    type="hidden"
                                    name="avatar"
                                    id="avatar"
                                    placeholder="URL"
                                    className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                                    defaultValue={props.user.avatar}
                                    />                    
                                    <ImageUploader 
                                    target="avatar"
                                    id="avatar-upload"
                                    buttonMsg="Change avatar"
                                    handleAvatarChange={handleAvatarChange}
                                    imageRef={imageSrc ? imageSrc : props.user.avatar}
                                    /> */}
                                </div>
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
