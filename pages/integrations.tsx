import Head from 'next/head';
import prisma from '../lib/prisma';
import Shell from '../components/Shell';
import { useState } from 'react';
import { useSession, getSession } from 'next-auth/client';

export default function Home(props) {
    const [session, loading] = useSession();
    const [showAddModal, setShowAddModal] = useState(false);

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    } else {
        if (!session) {
            window.location.href = "/";
        }
    }

    function toggleAddModal() {
        setShowAddModal(!showAddModal);
    }

    function googleCalendarHandler() {
        fetch('/api/integrations/googlecalendar/add')
            .then((response) => response.json())
            .then((data) => window.location.href = data.url);
    }

    return (
        <div>
            <Head>
                <title>Integrations | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Shell heading="Integrations">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <ul className="divide-y divide-gray-200">
                        {props.credentials.map((integration) =>
                            <li>
                                <a href="#" className="block hover:bg-gray-50">
                                    <div className="flex items-center px-4 py-4 sm:px-6">
                                        <div className="min-w-0 flex-1 flex items-center">
                                            <div className="flex-shrink-0">
                                                {integration.type == 'google_calendar' && <img className="h-10 w-10 mr-2" src="integrations/google-calendar.png" alt="Google Calendar" />}
                                            </div>
                                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                                <div>
                                                    {integration.type == 'google_calendar' && <p className="text-sm font-medium text-blue-600 truncate">Google Calendar</p>}
                                                    <p className="mt-2 flex items-center text-sm text-gray-500">
                                                        {integration.type == 'google_calendar' && <span className="truncate">Calendar Integration</span>}
                                                    </p>
                                                </div>
                                                <div className="hidden md:block">
                                                    <div>
                                                        {integration.key &&
                                                            <p className="mt-3 flex items-center text text-gray-500">
                                                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                Connected
                                                            </p>
                                                        }
                                                        {!integration.key &&
                                                            <p className="mt-3 flex items-center text text-gray-500">
                                                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            Not connected
                                                        </p>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd"
                                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                    clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </a>
                            </li>
                        )}
                    </ul>
                    {props.credentials.length == 0 &&
                        <div className="bg-white shadow sm:rounded-lg">
                            <div className="flex">
                                <div className="py-9 pl-8">
                                    <svg className="text-blue-600 w-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
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
                                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
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
                                    <li className="flex py-4">
                                        <div className="w-1/12 mr-4 pt-2">
                                            <img className="h-8 w-8 mr-2" src="integrations/google-calendar.png" alt="Google Calendar" />
                                        </div>
                                        <div className="w-10/12">
                                            <h2 className="text-gray-800 font-medium">Google Calendar</h2>
                                            <p className="text-gray-400 text-sm">For personal and business accounts</p>
                                        </div>
                                        <div className="w-2/12 text-right pt-2">
                                            <button onClick={googleCalendarHandler} className="font-medium text-blue-600 hover:text-blue-500">Add</button>
                                        </div>
                                    </li>
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

export async function getServerSideProps(context) {
    const session = await getSession(context);

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
            type: true,
            key: true
        }
    });
    return {
      props: {credentials}, // will be passed to the page component as props
    }
}