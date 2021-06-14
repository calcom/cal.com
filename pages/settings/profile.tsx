import Head from 'next/head';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import prisma from '../../lib/prisma';
import Modal from '../../components/Modal';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';
import Avatar from '../../components/Avatar';
import { signIn, useSession, getSession } from 'next-auth/client';
import TimezoneSelect from 'react-timezone-select';
import {UsernameInput} from "../../components/ui/UsernameInput";
import ErrorAlert from "../../components/ui/alerts/Error";

export default function Settings(props) {
    const [ session, loading ] = useSession();
    const router = useRouter();
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const usernameRef = useRef<HTMLInputElement>();
    const nameRef = useRef<HTMLInputElement>();
    const descriptionRef = useRef<HTMLTextAreaElement>();
    const avatarRef = useRef<HTMLInputElement>();

    const [ selectedTimeZone, setSelectedTimeZone ] = useState({ value: props.user.timeZone });
    const [ selectedWeekStartDay, setSelectedWeekStartDay ] = useState(props.user.weekStart || 'Sunday');

    const [ hasErrors, setHasErrors ] = useState(false);
    const [ errorMessage, setErrorMessage ] = useState('');

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    }

    const closeSuccessModal = () => { setSuccessModalOpen(false); }

    const handleError = async (resp) => {
      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.message);
      }
    }

    async function updateProfileHandler(event) {
        event.preventDefault();

        const enteredUsername = usernameRef.current.value;
        const enteredName = nameRef.current.value;
        const enteredDescription = descriptionRef.current.value;
        const enteredAvatar = avatarRef.current.value;
        const enteredTimeZone = selectedTimeZone.value;
        const enteredWeekStartDay = selectedWeekStartDay;

        // TODO: Add validation

        const response = await fetch('/api/user/profile', {
            method: 'PATCH',
            body: JSON.stringify({username: enteredUsername, name: enteredName, description: enteredDescription, avatar: enteredAvatar, timeZone: enteredTimeZone, weekStart: enteredWeekStartDay}),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(handleError).then( () => {
          setSuccessModalOpen(true);
          setHasErrors(false); // dismiss any open errors
        }).catch( (err) => {
          setHasErrors(true);
          setErrorMessage(err.message);
        });
    }

    return(
        <Shell heading="Profile">
            <Head>
                <title>Profile | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <SettingsShell>
                <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateProfileHandler}>
                    {hasErrors && <ErrorAlert message={errorMessage} />}
                    <div className="py-6 px-4 sm:p-6 lg:pb-8">
                        <div>
                            <h2 className="text-lg leading-6 font-medium text-gray-900">Profile</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Review and change your public page details.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col lg:flex-row">
                            <div className="flex-grow space-y-6">
                                <div className="flex">
                                    <div className="w-1/2 mr-2">
                                        <UsernameInput ref={usernameRef} defaultValue={props.user.username} />
                                    </div>
                                    <div className="w-1/2 ml-2">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
                                        <input ref={nameRef} type="text" name="name" id="name" autoComplete="given-name" placeholder="Your name" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" defaultValue={props.user.name} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                                        About
                                    </label>
                                    <div className="mt-1">
                                        <textarea ref={descriptionRef} id="about" name="about" placeholder="A little something about yourself." rows={3} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md">{props.user.bio}</textarea>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                                        Timezone
                                    </label>
                                    <div className="mt-1">
                                        <TimezoneSelect id="timeZone" value={selectedTimeZone} onChange={setSelectedTimeZone} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="weekStart" className="block text-sm font-medium text-gray-700">
                                        First Day of Week
                                    </label>
                                    <div className="mt-1">
                                        <select id="weekStart" value={selectedWeekStartDay} onChange={e => setSelectedWeekStartDay(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md">
                                            <option value="Sunday">Sunday</option>
                                            <option value="Monday">Monday</option>
                                        </select>
                                    </div>
                                </div>
                                </div>

                                <div className="mt-6 flex-grow lg:mt-0 lg:ml-6 lg:flex-grow-0 lg:flex-shrink-0">
                                <p className="mb-2 text-sm font-medium text-gray-700" aria-hidden="true">
                                    Photo
                                </p>
                                <div className="mt-1 lg:hidden">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 inline-block rounded-full overflow-hidden h-12 w-12" aria-hidden="true">
                                            <Avatar user={props.user} className="rounded-full h-full w-full" />
                                        </div>
                                        {/* <div className="ml-5 rounded-md shadow-sm">
                                            <div className="group relative border border-gray-300 rounded-md py-2 px-3 flex items-center justify-center hover:bg-gray-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <label htmlFor="user_photo" className="relative text-sm leading-4 font-medium text-gray-700 pointer-events-none">
                                                    <span>Change</span>
                                                    <span className="sr-only"> user photo</span>
                                                </label>
                                                <input id="user_photo" name="user_photo" type="file" className="absolute w-full h-full opacity-0 cursor-pointer border-gray-300 rounded-md" />
                                            </div>
                                        </div> */}
                                    </div>
                                </div>

                                <div className="hidden relative rounded-full overflow-hidden lg:block">
                                    <Avatar
                                        user={props.user}
                                        className="relative rounded-full w-40 h-40"
                                        fallback={<div className="relative bg-blue-600 rounded-full w-40 h-40"></div>}
                                    />
                                    {/* <label htmlFor="user-photo" className="absolute inset-0 w-full h-full bg-black bg-opacity-75 flex items-center justify-center text-sm font-medium text-white opacity-0 hover:opacity-100 focus-within:opacity-100">
                                        <span>Change</span>
                                        <span className="sr-only"> user photo</span>
                                        <input type="file" id="user-photo" name="user-photo" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer border-gray-300 rounded-md" />
                                    </label> */}
                                </div>
                                <div className="mt-4">
                                    <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">Avatar URL</label>
                                    <input ref={avatarRef} type="text" name="avatar" id="avatar" placeholder="URL" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" defaultValue={props.user.avatar} />
                                </div>
                            </div>
                        </div>
                        <hr className="mt-8" />
                        <div className="py-4 flex justify-end">
                            <button type="submit" className="ml-2 bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Save
                            </button>
                        </div>
                    </div>
                </form>
                <Modal heading="Profile updated successfully" description="Your user profile has been updated successfully." open={successModalOpen} handleClose={closeSuccessModal} />
            </SettingsShell>
        </Shell>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);
    if (!session) {
        return { redirect: { permanent: false, destination: '/auth/login' } };
    }

    const user = await prisma.user.findFirst({
        where: {
            email: session.user.email,
        },
        select: {
            id: true,
            username: true,
            name: true,
            email: true,
            bio: true,
            avatar: true,
            timeZone: true,
            weekStart: true,
        }
    });

    return {
      props: {user}, // will be passed to the page component as props
    }
}