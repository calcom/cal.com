import Head from 'next/head';
import Link from 'next/link';
import prisma from '../lib/prisma';
import Avatar from '../components/Avatar';

export default function User(props) {
    const eventTypes = props.eventTypes.map(type =>
        <li key={type.id}>
            <Link href={'/' + props.user.username + '/' + type.slug}>
                <a className="block px-6 py-4">
                    <div className="inline-block w-3 h-3 rounded-full mr-2" style={{backgroundColor:getRandomColorCode()}}></div>
                    <h2 className="inline-block font-medium">{type.title}</h2>
                    <p className="inline-block text-gray-400 ml-2">{type.description}</p>
                </a>
            </Link>
        </li>
    );
    return (
        <div>
            <Head>
                <title>{props.user.name || props.user.username} | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="max-w-2xl mx-auto my-24">
                <div className="mb-8 text-center">
                    <Avatar user={props.user} className="mx-auto w-24 h-24 rounded-full mb-4" />
                    <h1 className="text-3xl font-semibold text-gray-800 mb-1">{props.user.name || props.user.username}</h1>
                    <p className="text-gray-600">{props.user.bio}</p>
                </div>
                <div className="bg-white shadow overflow-hidden rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {eventTypes}
                    </ul>
                    {eventTypes.length == 0 && 
                        <div className="p-8 text-center text-gray-400">
                            <h2 className="font-semibold text-3xl text-gray-600">Uh oh!</h2>
                            <p className="max-w-md mx-auto">This user hasn't set up any event types yet.</p>
                        </div>
                    }
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
            id: true,
            username: true,
            email:true,
            name: true,
            bio: true,
            avatar: true,
            eventTypes: true
        }
    });

    if (!user) {
       return {
           notFound: true,
       }
    }

    const eventTypes = await prisma.eventType.findMany({
        where: {
            userId: user.id,
            hidden: false
        }
    });

    return {
        props: {
            user,
            eventTypes
        },
    }
}  

// Auxiliary methods

export function getRandomColorCode() {
    let color = '#';
    for (let idx = 0; idx < 6; idx++) {
        color += Math.floor(Math.random() * 10);
    }
    return color;
}