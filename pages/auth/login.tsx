import Head from 'next/head';
import { getCsrfToken } from 'next-auth/client';

export default function Login({ csrfToken }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Head>
            <title>Login</title>
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Sign in to your account
            </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 mx-2 shadow rounded-lg sm:px-10">
                <form className="space-y-6" method="post" action="/api/auth/callback/credentials">
                    <input name='csrfToken' type='hidden' defaultValue={csrfToken} hidden/>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email address
                        </label>
                        <div className="mt-1">
                            <input id="email" name="email" type="email" autoComplete="email" placeholder="john.doe@example.com" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <div className="mt-1">
                            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="•••••••••••••" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  )
}

Login.getInitialProps = async ({ req, res }) => {
  return {
    csrfToken: await getCsrfToken({ req })
  }
}