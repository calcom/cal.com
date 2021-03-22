import Head from 'next/head'
import Link from 'next/link'
import prisma from '../lib/prisma'

export default function User(props) {
    const eventTypes = props.user.eventTypes.map(type =>
        <Link href={props.user.username + '/' + type.id.toString()}>
            <a>
                <li key={type.id} className="px-6 py-4">
                    <div className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
                    <h2 className="inline-block font-medium">{type.title}</h2>
                    <p className="inline-block text-gray-400 ml-2">{type.description}</p>
                </li>
            </a>
        </Link>
    );
    return (
        <div>
            <Head>
                <title>{props.user.name} | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="max-w-2xl mx-auto my-24">
                <div className="mb-8 text-center">
                    <img src={props.user.avatar} alt="Avatar" className="mx-auto w-24 h-24 rounded-full mb-4"/>
                    <h1 className="text-3xl font-semibold text-gray-800 mb-1">{props.user.name}</h1>
                    <p className="text-gray-600">{props.user.bio}</p>
                </div>
                <div className="bg-white shadow overflow-hidden rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {eventTypes}
                    </ul>
                </div>
            </main>
        </div>
    )
}

export async function getServerSideProps(context) {
    const user = await prisma.user.findFirst({
        where: {
          username: context.query.user,
        },
        select: {
            username: true,
            name: true,
            bio: true,
            avatar: true,
            eventTypes: true
        }
    });

    return {
        props: {
            user
        },
    }
}  