import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import Modal from '../../components/Modal';
import Shell from '../../components/Shell';
import { useRouter } from 'next/router';
import { useRef } from 'react';
import { useState } from 'react';
import { useSession, getSession } from 'next-auth/client';
import { PlusIcon, ClockIcon } from '@heroicons/react/outline';

export default function Availability(props) {
    const [ session, loading ] = useSession();
    const router = useRouter();
    const [showAddModal, setShowAddModal] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [showChangeTimesModal, setShowChangeTimesModal] = useState(false);
    const titleRef = useRef<HTMLInputElement>();
    const slugRef = useRef<HTMLInputElement>();
    const descriptionRef = useRef<HTMLTextAreaElement>();
    const lengthRef = useRef<HTMLInputElement>();
    const isHiddenRef = useRef<HTMLInputElement>();

    const startHoursRef = useRef<HTMLInputElement>();
    const startMinsRef = useRef<HTMLInputElement>();
    const endHoursRef = useRef<HTMLInputElement>();
    const endMinsRef = useRef<HTMLInputElement>();

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    }

    function toggleAddModal() {
        setShowAddModal(!showAddModal);
    }

    function toggleChangeTimesModal() {
        setShowChangeTimesModal(!showChangeTimesModal);
    }

    const closeSuccessModal = () => { setSuccessModalOpen(false); router.replace(router.asPath); }

    function convertMinsToHrsMins (mins) {
        let h = Math.floor(mins / 60);
        let m = mins % 60;
        h = h < 10 ? '0' + h : h;
        m = m < 10 ? '0' + m : m;
        return `${h}:${m}`;
    }

    async function createEventTypeHandler(event) {
        event.preventDefault();

        const enteredTitle = titleRef.current.value;
        const enteredSlug = slugRef.current.value;
        const enteredDescription = descriptionRef.current.value;
        const enteredLength = lengthRef.current.value;
        const enteredIsHidden = isHiddenRef.current.checked;

        // TODO: Add validation

        const response = await fetch('/api/availability/eventtype', {
            method: 'POST',
            body: JSON.stringify({title: enteredTitle, slug: enteredSlug, description: enteredDescription, length: enteredLength, hidden: enteredIsHidden}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (enteredTitle && enteredLength) {
            router.replace(router.asPath);
            toggleAddModal();
        }
    }

    async function updateStartEndTimesHandler(event) {
        event.preventDefault();

        const enteredStartHours = parseInt(startHoursRef.current.value);
        const enteredStartMins = parseInt(startMinsRef.current.value);
        const enteredEndHours = parseInt(endHoursRef.current.value);
        const enteredEndMins = parseInt(endMinsRef.current.value);

        const startMins = enteredStartHours * 60 + enteredStartMins;
        const endMins = enteredEndHours * 60 + enteredEndMins;

        // TODO: Add validation

        const response = await fetch('/api/availability/day', {
            method: 'PATCH',
            body: JSON.stringify({start: startMins, end: endMins}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        setShowChangeTimesModal(false);
        setSuccessModalOpen(true);
    }

    return(
        <div>
            <Head>
                <title>Availability | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Shell heading="Availability">
                <div className="mb-4 sm:flex sm:items-center sm:justify-between">
                    <h3 className="text-lg leading-6 font-medium text-white">
                        Event Types
                    </h3>
                    <div className="mt-3 sm:mt-0 sm:ml-4">
                        <button onClick={toggleAddModal} type="button" className="btn-sm btn-white">
                            New event type
                        </button>
                    </div>
                </div>
                <div className="flex flex-col mb-8">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="shadow overflow-hidden border-b border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Length
                                            </th>
                                            <th scope="col" className="relative px-6 py-3">
                                                <span className="sr-only">Edit</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {props.types.map((eventType) =>
                                            <tr>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {eventType.title}
                                                    {eventType.hidden &&
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            Hidden
                                                        </span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {eventType.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {eventType.length} minutes
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link href={"/" + props.user.username + "/" + eventType.slug}><a target="_blank" className="text-blue-600 hover:text-blue-900 mr-2">View</a></Link>
                                                    <Link href={"/availability/event/" + eventType.id}><a className="text-blue-600 hover:text-blue-900">Edit</a></Link>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Change the start and end times of your day
                        </h3>
                        <div className="mt-2 max-w-xl text-sm text-gray-500">
                            <p>
                                Currently, your day is set to start at {convertMinsToHrsMins(props.user.startTime)} and end at {convertMinsToHrsMins(props.user.endTime)}.
                            </p>
                        </div>
                        <div className="mt-5">
                            <button onClick={toggleChangeTimesModal} type="button" className="btn btn-primary">
                                Change available times
                            </button>
                        </div>
                    </div>
                </div>
                {showAddModal &&
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div className="sm:flex sm:items-start mb-4">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <PlusIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Add a new event type
                                        </h3>
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Create a new event type for people to book times with.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <form onSubmit={createEventTypeHandler}>
                                    <div>
                                        <div className="mb-4">
                                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                                            <div className="mt-1">
                                                <input ref={titleRef} type="text" name="title" id="title" required className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="Quick Chat" />
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">URL</label>
                                            <div className="mt-1">
                                                <div className="flex rounded-md shadow-sm">
                                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                                        {location.hostname}/{props.user.username}/
                                                    </span>
                                                    <input
                                                        ref={slugRef}
                                                        type="text"
                                                        name="slug"
                                                        id="slug"
                                                        required
                                                        className="flex-1 block w-full focus:ring-blue-500 focus:border-blue-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                            <div className="mt-1">
                                                <textarea ref={descriptionRef} name="description" id="description" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="A quick video meeting."></textarea>
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="length" className="block text-sm font-medium text-gray-700">Length</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <input ref={lengthRef} type="number" name="length" id="length" required className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-20 sm:text-sm border-gray-300 rounded-md" placeholder="15" />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                                                    minutes
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="my-8">
                                        <div className="relative flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    ref={isHiddenRef}
                                                    id="ishidden"
                                                    name="ishidden"
                                                    type="checkbox"
                                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="ishidden" className="font-medium text-gray-700">
                                                    Hide this event type
                                                </label>
                                                <p className="text-gray-500">Hide the event type from your page, so it can only be booked through it's URL.</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* TODO: Add an error message when required input fields empty*/}
                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                        <button type="submit" className="btn btn-primary">
                                            Create
                                        </button>
                                        <button onClick={toggleAddModal} type="button" className="btn btn-white mr-2">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                }
                {showChangeTimesModal &&
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div className="sm:flex sm:items-start mb-4">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <ClockIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Change your available times
                                        </h3>
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Set the start and end time of your day.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <form onSubmit={updateStartEndTimesHandler}>
                                    <div className="flex mb-4">
                                        <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">Start time</label>
                                        <div>
                                            <label htmlFor="hours" className="sr-only">Hours</label>
                                            <input ref={startHoursRef} type="number" name="hours" id="hours" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="9" defaultValue={convertMinsToHrsMins(props.user.startTime).split(":")[0]} />
                                        </div>
                                        <span className="mx-2 pt-1">:</span>
                                        <div>
                                            <label htmlFor="minutes" className="sr-only">Minutes</label>
                                            <input ref={startMinsRef} type="number" name="minutes" id="minutes" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="30" defaultValue={convertMinsToHrsMins(props.user.startTime).split(":")[1]} />
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">End time</label>
                                        <div>
                                            <label htmlFor="hours" className="sr-only">Hours</label>
                                            <input ref={endHoursRef} type="number" name="hours" id="hours" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="17" defaultValue={convertMinsToHrsMins(props.user.endTime).split(":")[0]} />
                                        </div>
                                        <span className="mx-2 pt-1">:</span>
                                        <div>
                                            <label htmlFor="minutes" className="sr-only">Minutes</label>
                                            <input ref={endMinsRef} type="number" name="minutes" id="minutes" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="30" defaultValue={convertMinsToHrsMins(props.user.endTime).split(":")[1]} />
                                        </div>
                                    </div>
                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                        <button type="submit" className="btn btn-primary">
                                            Update
                                        </button>
                                        <button onClick={toggleChangeTimesModal} type="button" className="btn btn-white mr-2">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                }
                <Modal heading="Start and end times changed" description="The start and end times for your day have been changed successfully." open={successModalOpen} handleClose={closeSuccessModal} />
            </Shell>
        </div>
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
            startTime: true,
            endTime: true
        }
    });

    const types = await prisma.eventType.findMany({
        where: {
            userId: user.id,
        },
        select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            length: true,
            hidden: true
        }
    });
    return {
      props: {user, types}, // will be passed to the page component as props
    }
}