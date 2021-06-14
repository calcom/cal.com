import prisma from '../../lib/prisma';

export default function Type(props) {
    // Just redirect to the schedule page to reschedule it.
    return null;
}

export async function getServerSideProps(context) {
    const booking = await prisma.booking.findFirst({
        where: {
            uid: context.query.uid,
        },
        select: {
            id: true,
            user: {select: {username: true}},
            eventType: {select: {slug: true}},
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            attendees: true
        }
    });

    return {
        redirect: {
            destination: '/' + booking.user.username + '/' + booking.eventType.slug + '?rescheduleUid=' + context.query.uid,
            permanent: false,
        },
    }
}
