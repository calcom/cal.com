import Head from 'next/head';
import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';
import prisma from '../../lib/prisma';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';
import { signIn, useSession, getSession } from 'next-auth/client';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Settings(props) {

    const usernameRef = useRef();
    const nameRef = useRef();
    const descriptionRef = useRef();

    const countryRef = useRef();
    const languageRef = useRef();
    const timezoneRef = useRef();
    const timeFormatRef = useRef();

    const locale = (): string => (languageRef.current && countryRef.current) ? languageRef.current.value + '-' + countryRef.current.value : props.user.locale || 'en-gb';

    const [ session, loading ] = useSession();
    const [showConfirmFillCountryPresetsModal, setShowConfirmFillCountryPresetsModal] = useState(false);
    const [ currentFormattedTime, setCurrentFormattedTime ] = useState(dayjs().locale(locale()).format('h:mm A'));

    // instead of listening for changes on each invidual field, this fires every second also showing the current time accurately.
    useEffect(() => {
        const interval = setInterval(updateFormattedTime, 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    } else {
        if (!session) {
            window.location.href = "/auth/login";
        }
    }

    let previousLocale: string;

    function attemptAutofillCountryPresets() {
        // if (checkPresets(previousLocale)) setShowConfirmFillCountryPresetsModal(true);
        // else autofillCountryPresets();
        autofillCountryPresets();
    }

    function autofillCountryPresets() {
        // TODO: Make this smarter
        if (countryRef.current.value == 'nl') {
            languageRef.current.value = 'nl';
            timezoneRef.current.value = 'Europe/Amsterdam';
            timeFormatRef.current.value = '24h';
        } else if (countryRef.current.value == 'gb') {
            languageRef.current.value = 'en';
            timezoneRef.current.value = 'Europe/London';
            timeFormatRef.current.value = '12h';
        }

        if (showConfirmFillCountryPresetsModal) {
            setShowConfirmFillCountryPresetsModal(false);
        }
    }

    async function updateProfileHandler(event) {
        event.preventDefault();

        const enteredUsername = usernameRef.current.value;
        const enteredName = nameRef.current.value;
        const enteredDescription = descriptionRef.current.value;
        const enteredLocale = locale();
        const enteredTimezone = timezoneRef.current.value;

        // TODO: Add validation

        const response = await fetch('/api/user/profile', {
            method: 'PATCH',
            body: JSON.stringify({username: enteredUsername, name: enteredName, description: enteredDescription, locale: enteredLocale, timezone: enteredTimezone }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(response);
    }

    function updateFormattedTime() {
        if (timezoneRef.current && timeFormatRef.current)
            setCurrentFormattedTime(dayjs().tz(timezoneRef.current.value).format(timeFormatRef.current.value == '12h' ? 'h:mm A' : 'H:mm'));
    }

    return(
        <Shell heading="Profile">
            <Head>
                <title>Profile | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <SettingsShell>
                <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateProfileHandler}>
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
                                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                            Username
                                        </label>
                                        <div className="mt-1 rounded-md shadow-sm flex">
                                            <span className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-md px-3 inline-flex items-center text-gray-500 sm:text-sm">
                                                {window.location.hostname}/
                                            </span>
                                            <input ref={usernameRef} type="text" name="username" id="username" autoComplete="username" className="focus:ring-blue-500 focus:border-blue-500 flex-grow block w-full min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300" defaultValue={props.user.username} />
                                        </div>
                                    </div>
                                    <div className="w-1/2 ml-2">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
                                        <input ref={nameRef} type="text" name="name" id="name" autoComplete="given-name" placeholder="Your name" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" defaultValue={props.user.name} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                                        About
                                    </label>
                                    <div className="mt-1">
                                        <textarea ref={descriptionRef} id="about" name="about" placeholder="A little something about yourself." rows={3} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md" defaultValue={props.user.bio}></textarea>
                                    </div>
                                </div>
                                <div className="flex">
                                    <div className="w-1/2 mr-2">
                                        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                                            Country
                                        </label>
                                        <select ref={countryRef} id="country" onClick={ () => { previousLocale = locale() }} onChange={attemptAutofillCountryPresets} className="mt-1 rounded-md shadow-sm flex-grow block focus:border-blue-500 border-gray-300 w-full sm:text-sm" defaultValue={locale().substr(3)}>
                                            <option value="gb">United Kingdom</option>
                                            <option value="nl">Netherlands</option>
                                        </select>
                                    </div>
                                    <div className="w-1/2 ml-2">
                                        <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                                            Language
                                        </label>
                                        <select ref={languageRef} id="language" className="mt-1 rounded-md shadow-sm flex-grow block focus:border-blue-500 border-gray-300 w-full sm:text-sm" defaultValue={locale().substr(0, 2)}>
                                            <option value="en">English</option>
                                            <option value="nl">Dutch</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex">
                                    <label htmlFor="tz" className="w-1/2 block text-sm font-medium text-gray-700">
                                        Time Zone
                                    </label>
                                    <div className="w-1/2 text-right text-sm">
                                        Current Time:
                                        <span> {currentFormattedTime}</span>
                                    </div>
                                    </div>
                                    <select defaultValue={props.user.timezone} ref={timezoneRef} id="tz" className="mt-1 rounded-md shadow-sm flex-grow block focus:border-blue-500 border-gray-300 w-full sm:text-sm">
                                        <optgroup label="Europe">
                                            <option value="Europe/London">UK, Ireland, Lisbon Time</option>
                                            <option value="Europe/Amsterdam">Central Europian Time (Amsterdam, Berlin, Rome, Vienna)</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="flex">
                                    <div className="w-1/2 mr-2">
                                        <label htmlFor="date-format" className="block text-sm font-medium text-gray-700">
                                            Date Format
                                        </label>
                                        <select disabled id="date-format" className="mt-1 rounded-md shadow-sm opacity-50 flex-grow block focus:border-blue-500 border-gray-300 w-full sm:text-sm">
                                            <option>DD/MM/YYYY</option>
                                            {/*<option>MM/DD/YYYY</option>*/}
                                        </select>
                                    </div>
                                    <div className="w-1/2 ml-2">
                                        <label htmlFor="time-format" className="block text-sm font-medium text-gray-700">
                                            Time Format
                                        </label>
                                        <select disabled ref={timeFormatRef} id="time-format" className="mt-1 opacity-50 rounded-md shadow-sm flex-grow block focus:border-blue-500 border-gray-300 w-full sm:text-sm">
                                            <option value="12h">AM/PM</option>
                                            <option value="24h">24-hour clock</option>
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
                                            <img className="rounded-full h-full w-full" src={props.user.avatar} alt="" />
                                        </div>
                                        <div className="ml-5 rounded-md shadow-sm">
                                            <div className="group relative border border-gray-300 rounded-md py-2 px-3 flex items-center justify-center hover:bg-gray-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <label htmlFor="user_photo" className="relative text-sm leading-4 font-medium text-gray-700 pointer-events-none">
                                                    <span>Change</span>
                                                    <span className="sr-only"> user photo</span>
                                                </label>
                                                <input id="user_photo" name="user_photo" type="file" className="absolute w-full h-full opacity-0 cursor-pointer border-gray-300 rounded-md" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden relative rounded-full overflow-hidden lg:block">
                                    {props.user.avatar && <img className="relative rounded-full w-40 h-40" src={props.user.avatar} alt="" />}
                                    {!props.user.avatar && <div className="relative bg-blue-600 rounded-full w-40 h-40"></div>}
                                    <label htmlFor="user-photo" className="absolute inset-0 w-full h-full bg-black bg-opacity-75 flex items-center justify-center text-sm font-medium text-white opacity-0 hover:opacity-100 focus-within:opacity-100">
                                        <span>Change</span>
                                        <span className="sr-only"> user photo</span>
                                        <input type="file" id="user-photo" name="user-photo" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer border-gray-300 rounded-md" />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <hr className="mt-8" />
                        <div className="py-4 flex justify-end">
                            <button type="button" className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Cancel
                            </button>
                            <button type="submit" className="ml-2 bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Save
                            </button>
                        </div>
                    </div>
                </form>
                {/*{ showConfirmFillCountryPresetsModal &&
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div className="sm:flex sm:items-start mb-4">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Update time settings to <span className="text-blue-700">{countryRef.current.selectedOptions[0].innerHTML}</span> presets?
                                        </h3>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-4 text-center">
                                    <button className="btn btn-primary mr-2" onClick={autofillCountryPresets}>
                                        Yes
                                    </button>
                                    <button onClick={() => setShowConfirmFillCountryPresetsModal(false)} type="button" className="btn btn-white mr-2">
                                        No, keep my existing settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                }*/}
            </SettingsShell>
        </Shell>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);

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
            timezone: true,
            locale: true,
        }
    });

    return {
      props: {user}, // will be passed to the page component as props
    }
}