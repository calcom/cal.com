import Head from 'next/head';
import Link from 'next/link';
import { useRef, useState } from 'react';
import prisma from '../../lib/prisma';
import Modal from '../../components/Modal';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';
import { signIn, useSession, getSession } from 'next-auth/client';

export default function Settings(props) {
    const [ session, loading ] = useSession();
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const usernameRef = useRef();
    const nameRef = useRef();
    const descriptionRef = useRef();
    const timezoneRef = useRef();

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    } else {
        if (!session) {
            window.location.href = "/auth/login";
        }
    }

    const closeSuccessModal = () => { setSuccessModalOpen(false); }

    async function updateProfileHandler(event) {
        event.preventDefault();

        const enteredUsername = usernameRef.current.value;
        const enteredName = nameRef.current.value;
        const enteredDescription = descriptionRef.current.value;
        const enteredTimezone = timezoneRef.current.value;

        // TODO: Add validation

        const response = await fetch('/api/user/profile', {
            method: 'PATCH',
            body: JSON.stringify({username: enteredUsername, name: enteredName, description: enteredDescription, timeZone: enteredTimezone}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        setSuccessModalOpen(true);
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
                                        <textarea ref={descriptionRef} id="about" name="about" placeholder="A little something about yourself." rows={3} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md">{props.user.bio}</textarea>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                                        Timezone
                                    </label>
                                    <div className="mt-1">
                                        <select name="timezone" id="timeZone" defaultValue={props.user.timeZone} ref={timezoneRef} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md">
                                          <option disabled style={{display: "none"}}>Time Zone...</option>

                                          <optgroup label="Common">
                                            <option value="GMT">Dublin, Edinburgh, Lisbon, London</option>
                                            <option value="Europe/Brussels">Brussels, Copenhagen, Madrid, Paris</option>
                                          </optgroup>
                                          <optgroup label="America">
                                            <option value="America/Juneau">Alaska</option>
                                            <option value="America/Phoenix">Arizona</option>
                                            <option value="America/Belize">Central America</option>
                                            <option value="America/Bogota">Bogota, Lima, Quito</option>
                                            <option value="America/Boise">Mountain Time (US and Canada)</option>
                                            <option value="America/Argentina/Buenos_Aires">Buenos Aires, Georgetown</option>
                                            <option value="America/Caracas">Caracas, La Paz</option>
                                            <option value="America/Chicago">Chicago, Central Time</option>
                                            <option value="America/Chihuahua">Chihuahua, La Paz, Mazatlan</option>
                                            <option value="America/Dawson">Dawson</option>
                                            <option value="America/Detroit">Detroit</option>
                                            <option value="America/Glace_Bay">Atlantic Time, Canada</option>
                                            <option value="America/Godthab">Greenland</option>
                                            <option value="America/Indiana/Indianapolis">Indiana (East), Indianapolis</option>
                                            <option value="America/Mexico_City">Guadalajara, Mexico City, Monterrey</option>
                                            <option value="America/Regina">Saskatchewan</option>
                                            <option value="America/Santiago">Santiago</option>
                                            <option value="America/Sao_Paulo">Sao Paulo, Brasilia</option>
                                            <option value="America/St_Johns">Newfoundland and Labrador</option>
                                          </optgroup>

                                          <optgroup label="Europe">
                                            <option value="Europe/Amsterdam">Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna</option>
                                            <option value="Europe/Athens">Athens, Istanbul, Minsk</option>
                                            <option value="Europe/Belgrade">Belgrade, Bratislava, Budapest, Ljubljana, Prague</option>
                                            <option value="Europe/Brussels">Brussels, Copenhagen, Madrid, Paris</option>
                                            <option value="Europe/Bucharest">Bucharest</option>
                                            <option value="GMT">Dublin, Edinburgh, Lisbon, London</option>
                                            <option value="Europe/Helsinki">Helsinki, Kiev, Riga, Sofia, Tallinn, Vilnius</option>
                                            <option value="Europe/Moscow">Moscow, St. Petersburg, Volgograd</option>
                                          </optgroup>

                                          <optgroup label="Asia">
                                            <option value="Asia/Almaty">Almaty, Novosibirsk</option>
                                            <option value="Asia/Baghdad">Baghdad</option>
                                            <option value="Asia/Baku">Baku, Tbilisi, Yerevan</option>
                                            <option value="Asia/Bangkok">Bangkok, Hanoi, Jakarta</option>
                                            <option value="Asia/Colombo">Sri Jayawardenepura</option>
                                            <option value="Asia/Dhaka">Dhaka, Astana</option>
                                            <option value="Asia/Dubai">Abu Dhabi, Muscat</option>
                                            <option value="Asia/Irkutsk">Irkutsk, Ulaanbaatar</option>
                                            <option value="Asia/Jerusalem">Jerusalem</option>
                                            <option value="Asia/Kabul">Kabul</option>
                                            <option value="Asia/Karachi">Karachi, Islamabad, Tashkent</option>
                                            <option value="Asia/Kolkata">Kolkata, Chennai, Mumbai, New Delphi</option>
                                            <option value="Asia/Krasnoyarsk">Krasnoyarsk</option>
                                            <option value="Asia/Kuala_Lumpur">Kuala Lumpur, Singapore</option>
                                            <option value="Asia/Kuwait">Kuwait</option>
                                            <option value="Asia/Magadan">Magadan, Solomon Islands, New Caledonia</option>
                                            <option value="Asia/Rangoon">Yangon Rangoon</option>
                                            <option value="Asia/Seoul">Seoul</option>
                                            <option value="Asia/Shanghai">Beijing, Chongqing, Hong Kong SAR, Urumqi</option>
                                            <option value="Asia/Tehran">Tehran</option>
                                            <option value="Asia/Tokyo">Tokyo, Osaka, Sapporo</option>
                                            <option value="Asia/Vladivostok">Vladivostok</option>
                                            <option value="Asia/Yakutsk">Yakutsk</option>
                                            <option value="Asia/Yekaterinburg">Yekaterinburg</option>
                                          </optgroup>

                                          <optgroup label="Africa">
                                            <option value="Africa/Cairo">Cairo</option>
                                            <option value="Africa/Casablanca">Casablanca, Monrovia</option>
                                            <option value="Africa/Algiers">West Central Africa</option>
                                            <option value="Africa/Harare">Harare, Pretoria</option>
                                            <option value="Africa/Nairobi">Nairobi</option>
                                          </optgroup>

                                          <optgroup label="Australia">
                                            <option value="Australia/Adelaide">Adelaide</option>
                                            <option value="Australia/Brisbane">Brisbane</option>
                                            <option value="Australia/Darwin">Darwin</option>
                                            <option value="Australia/Hobart">Hobart, Tasmania</option>
                                            <option value="Australia/Perth">Perth</option>
                                            <option value="Australia/Sydney">Sydney, Melbourne, Canberra</option>
                                          </optgroup>

                                          <optgroup label="Atlantic">
                                            <option value="Atlantic/Azores">Azores</option>
                                            <option value="Atlantic/Cape_Verde">Cape Verde Islands</option>
                                            <option value="Atlantic/Canary">Canary Islands</option>
                                            <option value="Etc/GMT+2">Mid-Atlantic</option>
                                          </optgroup>

                                          <optgroup label="Pacific">
                                            <option value="Pacific/Auckland">Auckland, Wellington</option>
                                            <option value="Pacific/Fiji">Fiji Islands, Kamchatka, Marshall Islands</option>
                                            <option value="Pacific/Guam">Guam, Port Moresby</option>
                                            <option value="Pacific/Tongatapu">Nuku'alofa</option>
                                          </optgroup>

                                          <optgroup label="Antarctica">
                                            <option value="Antarctica/McMurdo">McMurdo, South Pole</option>
                                          </optgroup>

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
                <Modal heading="Profile updated successfully" description="Your user profile has been updated successfully." open={successModalOpen} handleClose={closeSuccessModal} />
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
            timeZone: true,
        }
    });

    return {
      props: {user}, // will be passed to the page component as props
    }
}
