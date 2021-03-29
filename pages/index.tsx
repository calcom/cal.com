import Head from 'next/head'
import Shell from '../components/Shell'
import { signIn, useSession } from 'next-auth/client'

export default function Home() {
    const [ session, loading ] = useSession();

    if (session) {
        return (
            <div>
                <Head>
                    <title>Calendso</title>
                    <link rel="icon" href="/favicon.ico" />
                </Head>

                <Shell heading="Dashboard">
                    <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
                        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96"></div>
                    </div>
                </Shell>
            </div>
        );
    } else {
        return (
            <div>
                <Head>
                    <title>Calendso</title>
                    <link rel="icon" href="/favicon.ico" />
                </Head>

                <main className="text-center">
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
                                <div>
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                                        <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Sign into your account
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Sign into your account to manage your bookings and other settings.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6">
                                    <button onClick={() => signIn()} type="button" className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm">
                                        Login to your account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }
}
