import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import prisma from '../../lib/prisma';
import Modal from '../../components/Modal';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';
import Avatar from '../../components/Avatar';
import { signIn, useSession, getSession } from 'next-auth/client';
import TimezoneSelect from 'react-timezone-select';

export default function Embed(props) {
    const [ session, loading ] = useSession();
    const router = useRouter();

    if (loading) {
        return <div className="loader"></div>;
    }

    return(
        <Shell heading="Embed">
            <Head>
                <title>Embed | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <SettingsShell>
                <div className="py-6 px-4 sm:p-6 lg:pb-8 lg:col-span-9">
                    <div className="mb-6">
                        <h2 className="text-lg leading-6 font-medium text-gray-900">Iframe Embed</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            The easiest way to embed Calendso on your website.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 space-x-4">
                        <div>
                            <label htmlFor="iframe" className="block text-sm font-medium text-gray-700">
                                Standard iframe
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="iframe"
                                    className="h-32 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                    placeholder="Loading..."
                                    defaultValue={'<iframe src="' + props.BASE_URL + '/' + session.user.username + '" frameborder="0" allowfullscreen></iframe>'}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="fullscreen" className="block text-sm font-medium text-gray-700">
                                Responsive full screen iframe
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="fullscreen"
                                    className="h-32 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                    placeholder="Loading..."
                                    defaultValue={'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Schedule a meeting</title><style>body {margin: 0;}iframe {height: calc(100vh - 4px);width: calc(100vw - 4px);box-sizing: border-box;}</style></head><body><iframe src="' + props.BASE_URL + '/' + session.user.username + '" frameborder="0" allowfullscreen></iframe></body></html>'}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                    <div className="my-6">
                        <h2 className="text-lg leading-6 font-medium text-gray-900">Calendso API</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Leverage our API for full control and customizability.
                        </p>
                    </div>
                    <a href="https://api.docs.calendso.com" className="btn btn-primary">Browse our API documentation</a>
                </div>
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

    const BASE_URL = process.env.BASE_URL;

    return {
      props: {user, BASE_URL}, // will be passed to the page component as props
    }
}
