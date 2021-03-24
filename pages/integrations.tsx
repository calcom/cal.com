import Head from 'next/head';
import Shell from '../components/Shell';
import { useState } from 'react';
import { useSession, getSession } from 'next-auth/client';

export default function Home() {
    const [ session, loading ] = useSession();
    const [ integrations, setIntegrations ] = useState([]);

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    } else {
        if (!session) {
            window.location.href="/";
        }
    }

    function getIntegrations() {
        fetch('/api/integrations')
            .then((response) => response.json())
            .then((data) => setIntegrations(data));
    }

    getIntegrations()

    return (
        <div>
            <Head>
                <title>Integrations | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Shell heading="Integrations">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <ul className="divide-y divide-gray-200">
                        {integrations.map((integration) =>
                            <li>
                                <a href="#" className="block hover:bg-gray-50">
                                    <div className="flex items-center px-4 py-4 sm:px-6">
                                        <div className="min-w-0 flex-1 flex items-center">
                                            <div className="flex-shrink-0">
                                                {integration.type == 'google_calendar' && <img className="h-10 w-10 mr-2" src="integrations/google-calendar.png" alt="Google Calendar"/>}
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
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                    </div>
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
            </Shell>
        </div>
    );
}