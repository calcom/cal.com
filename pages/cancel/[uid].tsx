import {useState} from 'react';
import Head from 'next/head';
import prisma from '../../lib/prisma';
import {useRouter} from 'next/router';
import dayjs from 'dayjs';
import {CalendarIcon, ClockIcon, XIcon} from '@heroicons/react/solid';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {collectPageParameters, telemetryEventTypes, useTelemetry} from "../../lib/telemetry";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function Type(props) {
    // Get router variables
    const router = useRouter();
    const { uid } = router.query;

    const [is24h, setIs24h] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const telemetry = useTelemetry();

    const cancellationHandler = async (event) => {
        setLoading(true);

        let payload = {
            uid: uid
        };

        telemetry.withJitsu(jitsu => jitsu.track(telemetryEventTypes.bookingCancelled, collectPageParameters()));
        const res = await fetch(
            '/api/cancel',
            {
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            }
        );

        if(res.status >= 200 && res.status < 300) {
            router.push('/cancel/success?user=' + props.user.username + '&title=' + props.eventType.title);
        } else {
            setLoading(false);
            setError("An error with status code " + res.status + " occurred. Please try again later.");
        }
    }

    return (
        <div>
            <Head>
                <title>
                    Cancel {props.booking.title} | {props.user.name || props.user.username} |
                    Calendso
                </title>
                <link rel="icon" href="/favicon.ico"/>
            </Head>
            <main className="max-w-3xl mx-auto my-24">
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div
                        className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 my-4 sm:my-0 transition-opacity" aria-hidden="true">
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                  aria-hidden="true">&#8203;</span>
                            <div
                                className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
                                role="dialog" aria-modal="true" aria-labelledby="modal-headline">
                                {error && <div>
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                        <XIcon className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            {error}
                                        </h3>
                                    </div>
                                </div>}
                                {!error && <div>
                                    <div
                                        className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                        <XIcon className="h-6 w-6 text-red-600"/>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                                            Really cancel your booking?
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Instead, you could also reschedule it.
                                            </p>
                                        </div>
                                        <div className="mt-4 border-t border-b py-4">
                                            <h2 className="text-lg font-medium text-gray-600 mb-2">{props.booking.title}</h2>
                                            <p className="text-gray-500 mb-1">
                                                <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1"/>
                                                {props.eventType.length} minutes
                                            </p>
                                            <p className="text-gray-500">
                                                <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1"/>
                                                {dayjs.utc(props.booking.startTime).format((is24h ? 'H:mm' : 'h:mma') + ", dddd DD MMMM YYYY")}
                                            </p>
                                        </div>
                                    </div>
                                </div>}
                                <div className="mt-5 sm:mt-6 text-center">
                                    <div className="mt-5">
                                        <button onClick={cancellationHandler} disabled={loading} type="button"
                                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm mx-2 btn-white">
                                            Cancel
                                        </button>
                                        <button onClick={() => router.push('/reschedule/' + uid)} disabled={loading} type="button"
                                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:text-sm mx-2 btn-white">
                                            Reschedule
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export async function getServerSideProps(context) {
    const user = await prisma.user.findFirst({
        where: {
            username: context.query.user,
        },
        select: {
            id: true,
            username: true,
            name: true,
        }
    });

    if (!user) {
        return {
            notFound: true,
        }
    }

    const eventType = await prisma.eventType.findFirst({
        where: {
            userId: user.id,
            slug: {
                equals: context.query.type,
            },
        },
        select: {
            id: true,
            title: true,
            description: true,
            length: true
        }
    });

    const booking = await prisma.booking.findFirst({
        where: {
            uid: context.query.uid,
        },
        select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            attendees: true
        }
    });

    // Workaround since Next.js has problems serializing date objects (see https://github.com/vercel/next.js/issues/11993)
    const bookingObj = Object.assign({}, booking, {
        startTime: booking.startTime.toString(),
        endTime: booking.endTime.toString()
    });

    return {
        props: {
            user,
            eventType,
            booking: bookingObj
        },
    }
}
