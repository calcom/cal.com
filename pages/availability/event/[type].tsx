import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRef } from 'react';
import prisma from '../../../lib/prisma';
import Shell from '../../../components/Shell';
import { useSession, getSession } from 'next-auth/client';

export default function EventType(props) {
    const router = useRouter();
    const [ session, loading ] = useSession();
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

    async function updateEventTypeHandler(event) {
        event.preventDefault();

        const enteredTitle = titleRef.current.value;
        const enteredDescription = descriptionRef.current.value;
        const enteredLength = lengthRef.current.value;

        // TODO: Add validation

        const response = await fetch('/api/availability/eventtype', {
            method: 'PATCH',
            body: JSON.stringify({id: props.eventType.id, title: enteredTitle, description: enteredDescription, length: enteredLength}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        router.push('/availability');
    }

    async function deleteEventTypeHandler(event) {
        event.preventDefault();

        const response = await fetch('/api/availability/eventtype', {
            method: 'DELETE',
            body: JSON.stringify({id: props.eventType.id}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        router.push('/availability');
    }

    return (
        <div>
            <Head>
                <title>{props.eventType.title} | Event Type | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Shell heading={'Event Type - ' + props.eventType.title}>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <form onSubmit={updateEventTypeHandler}>
                                    <div className="mb-4">
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                                        <div className="mt-1">
                                            <input ref={titleRef} type="text" name="title" id="title" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="Quick Chat" defaultValue={props.eventType.title} />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                        <div className="mt-1">
                                            <textarea ref={descriptionRef} name="description" id="description" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="A quick video meeting." defaultValue={props.eventType.description}></textarea>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="length" className="block text-sm font-medium text-gray-700">Length</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <input ref={lengthRef} type="number" name="length" id="length" className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-20 sm:text-sm border-gray-300 rounded-md" placeholder="15" defaultValue={props.eventType.length} />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                                                minutes
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary">Update</button>
                                    <Link href="/availability"><a className="ml-2 btn btn-white">Cancel</a></Link>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="bg-white shadow sm:rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Delete this event type
                                </h3>
                                <div className="mt-2 max-w-xl text-sm text-gray-500">
                                    <p>
                                        Once you delete this event type, it will be permanently removed.
                                    </p>
                                </div>
                                <div className="mt-5">
                                    <button onClick={deleteEventTypeHandler} type="button" className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm">
                                        Delete event type
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

    const eventType = await prisma.eventType.findUnique({
        where: {
          id: parseInt(context.query.type),
        },
        select: {
            id: true,
            title: true,
            description: true,
            length: true
        }
    });

    return {
        props: {
            eventType
        },
    }
}