import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import Shell from '../../components/Shell';
import Router from 'next/router';
import { useRef } from 'react';
import { useState } from 'react';
import { useSession, getSession } from 'next-auth/client';

export default function Availability(props) {
    const [ session, loading ] = useSession();
    const [showAddModal, setShowAddModal] = useState(false);
    const titleRef = useRef();
    const descriptionRef = useRef();
    const lengthRef = useRef();

    if (loading) {
        return <p className="text-gray-400">Loading...</p>;
    } else {
        if (!session) {
            window.location.href = "/auth/login";
        }
    }

    function toggleAddModal() {
        setShowAddModal(!showAddModal);
    }

    async function createEventTypeHandler(event) {
        event.preventDefault();

        const enteredTitle = titleRef.current.value;
        const enteredDescription = descriptionRef.current.value;
        const enteredLength = lengthRef.current.value;

        // TODO: Add validation

        const response = await fetch('/api/availability/eventtype', {
            method: 'POST',
            body: JSON.stringify({title: enteredTitle, description: enteredDescription, length: enteredLength}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(response);
        Router.reload();
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
                        <button onClick={toggleAddModal} type="button" className="btn-sm btn-primary">
                            New event type
                        </button>
                    </div>
                </div>
                <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
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
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {eventType.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {eventType.length} minutes
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                {showAddModal && 
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div className="sm:flex sm:items-start mb-4">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
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
                                                <input ref={titleRef} type="text" name="title" id="title" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="Quick Chat" />
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
                                                <input ref={lengthRef} type="number" name="length" id="length" className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-20 sm:text-sm border-gray-300 rounded-md" placeholder="15" />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                                                    minutes
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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

    const types = await prisma.eventType.findMany({
        where: {
            userId: user.id,
        },
        select: {
            id: true,
            title: true,
            description: true,
            length: true
        }
    });
    return {
      props: {types}, // will be passed to the page component as props
    }
}