import Head from 'next/head';
import prisma from '../../lib/prisma';
import { getIntegrationName, getIntegrationType } from '../../lib/integrations';
import Shell from '../../components/Shell';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, getSession } from 'next-auth/client';

export default function integration(props) {
    const router = useRouter();
    const [session, loading] = useSession();
    const [showAPIKey, setShowAPIKey] = useState(false);

    if (loading) {
        return <div className="loader"></div>;
    }

    function toggleShowAPIKey() {
        setShowAPIKey(!showAPIKey);
    }

    async function deleteIntegrationHandler(event) {
        event.preventDefault();

        const response = await fetch('/api/integrations', {
            method: 'DELETE',
            body: JSON.stringify({id: props.integration.id}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        router.push('/integrations');
    }

    return(
        <div>
            <Head>
                <title>{getIntegrationName(props.integration.type)} | Integrations | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Shell heading={getIntegrationName(props.integration.type)}>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 bg-white shadow overflow-hidden rounded-lg">
                        <div className="px-4 py-5 sm:px-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Integration Details
                            </h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Information about your {getIntegrationName(props.integration.type)} integration.
                            </p>
                        </div>
                        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                            <dl className="grid gap-y-8">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">
                                        Integration name
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {getIntegrationName(props.integration.type)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">
                                        Integration type
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {getIntegrationType(props.integration.type)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">
                                        API Key
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {!showAPIKey ?
                                            <span>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                                            :
                                            <div>
                                                <textarea name="apikey" rows={6} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" readOnly>{JSON.stringify(props.integration.key)}</textarea>
                                            </div>}
                                        <button onClick={toggleShowAPIKey} className="ml-2 font-medium text-blue-600 hover:text-blue-700">{!showAPIKey ? 'Show' : 'Hide'}</button>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                    <div>
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Delete this integration
                                </h3>
                                <div className="mt-2 max-w-xl text-sm text-gray-500">
                                    <p>
                                        Once you delete this integration, it will be permanently removed.
                                    </p>
                                </div>
                                <div className="mt-5">
                                    <button onClick={deleteIntegrationHandler} type="button" className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm">
                                        Delete integration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Shell>
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);

    const integration = await prisma.credential.findFirst({
        where: {
            id: parseInt(context.query.integration),
        },
        select: {
            id: true,
            type: true,
            key: true
        }
    });
    return {
      props: {integration}, // will be passed to the page component as props
    }
}