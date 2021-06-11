import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import Shell from '../../components/Shell';
import {useState} from 'react';
import {getSession, useSession} from 'next-auth/client';
import {CheckCircleIcon, ChevronRightIcon, PlusIcon, XCircleIcon} from '@heroicons/react/solid';
import {InformationCircleIcon} from '@heroicons/react/outline';

export default function Home({ integrations }) {
    const [session, loading] = useSession();
    const [showAddModal, setShowAddModal] = useState(false);

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    }

    function toggleAddModal() {
        setShowAddModal(!showAddModal);
    }

    function integrationHandler(type) {
        fetch('/api/integrations/' + type.replace('_', '') + '/add')
            .then((response) => response.json())
            .then((data) => window.location.href = data.url);
    }

    return (
        <div>
            <Head>
                <title>Integrations | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Shell heading="Integrations" noPaddingBottom>
                <div className="text-right py-2">
                    <button onClick={toggleAddModal} type="button"
                            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Add new integration
                    </button>
                </div>
                <div className="bg-white shadow overflow-hidden rounded-lg">
                    {integrations.filter( (ig) => ig.credential ).length !== 0 ? <ul className="divide-y divide-gray-200">
                        {integrations.filter(ig => ig.credential).map( (ig) => (<li>
                            <Link href={"/integrations/" + ig.credential.id}>
                                <a className="block hover:bg-gray-50">
                                    <div className="flex items-center px-4 py-4 sm:px-6">
                                        <div className="min-w-0 flex-1 flex items-center">
                                            <div className="flex-shrink-0">
                                                <img className="h-10 w-10 mr-2" src={ig.imageSrc} alt={ig.title} />
                                            </div>
                                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-blue-600 truncate">{ig.title}</p>
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        {ig.type.endsWith('_calendar') && <span className="truncate">Calendar Integration</span>}
                                                    </p>
                                                </div>
                                                <div className="hidden md:block">
                                                    {ig.credential.key && <p className="mt-2 flex items-center text text-gray-500">
                                                        <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                                                        Connected
                                                    </p>}
                                                    {!ig.credential.key && <p className="mt-3 flex items-center text text-gray-500">
                                                        <XCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" />
                                                        Not connected
                                                    </p>}
                                                </div>
                                            </div>
                                            <div>
                                                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            </Link>
                        </li>))}
                    </ul>
                    :
                    <div className="bg-white shadow rounded-lg">
                        <div className="flex">
                            <div className="py-9 pl-8">
                                <InformationCircleIcon className="text-blue-600 w-16" />
                            </div>
                            <div className="py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                     You don't have any integrations added.
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                    <p>
                                        You currently do not have any integrations set up. Add your first integration to get started.
                                    </p>
                                </div>
                                <div className="mt-3 text-sm">
                                    <button onClick={toggleAddModal} className="font-medium text-blue-600 hover:text-blue-500"> Add your first integration <span aria-hidden="true">&rarr;</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    }
                </div>
                {showAddModal &&
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* <!--
                          Background overlay, show/hide based on modal state.

                          Entering: "ease-out duration-300"
                            From: "opacity-0"
                            To: "opacity-100"
                          Leaving: "ease-in duration-200"
                            From: "opacity-100"
                            To: "opacity-0"
                        --> */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        {/* <!--
                          Modal panel, show/hide based on modal state.

                          Entering: "ease-out duration-300"
                            From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            To: "opacity-100 translate-y-0 sm:scale-100"
                          Leaving: "ease-in duration-200"
                            From: "opacity-100 translate-y-0 sm:scale-100"
                            To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        --> */}
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <PlusIcon className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Add a new integration
                                    </h3>
                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Link a new integration to your account.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="my-4">
                                <ul className="divide-y divide-gray-200">
                                    {integrations.filter( (integration) => integration.installed ).map( (integration) => (<li className="flex py-4">
                                        <div className="w-1/12 mr-4 pt-2">
                                            <img className="h-8 w-8 mr-2" src={integration.imageSrc} alt={integration.title} />
                                        </div>
                                        <div className="w-10/12">
                                            <h2 className="text-gray-800 font-medium">{ integration.title }</h2>
                                            <p className="text-gray-400 text-sm">{ integration.description }</p>
                                        </div>
                                        <div className="w-2/12 text-right pt-2">
                                            <button onClick={() => integrationHandler(integration.type)} className="font-medium text-blue-600 hover:text-blue-500">Add</button>
                                        </div>
                                    </li>))}
                                </ul>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button onClick={toggleAddModal} type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                }
            </Shell>
        </div>
    );
}

const validJson = (jsonString: string) => {
    try {
        const o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) {}
    return false;
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
            id: true
        }
    });

    const credentials = await prisma.credential.findMany({
        where: {
            userId: user.id,
        },
        select: {
            id: true,
            type: true,
            key: true
        }
    });

    const integrations = [ {
        installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
        credential: credentials.find( (integration) => integration.type === "google_calendar" ) || null,
        type: "google_calendar",
        title: "Google Calendar",
        imageSrc: "integrations/google-calendar.png",
        description: "For personal and business accounts",
    }, {
        installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
        type: "office365_calendar",
        credential: credentials.find( (integration) => integration.type === "office365_calendar" ) || null,
        title: "Office 365 / Outlook.com Calendar",
        imageSrc: "integrations/office-365.png",
        description: "For personal and business accounts",
    } ];

    return {
      props: {integrations},
    }
}