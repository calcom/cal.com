import prisma from '../../lib/prisma';

export default async function handler(req, res) {
    if (req.method == "POST") {
        const uid = req.body.uid;

        const bookingToDelete = await prisma.booking.findFirst({
            where: {
                uid: uid,
            },
            select: {
                id: true,
                attendees: true,
                references: true
            }
        });

        await prisma.attendee.deleteMany({
            where: {
                bookingId: bookingToDelete.id
            }
        });

        await prisma.bookingReference.deleteMany({
            where: {
                bookingId: bookingToDelete.id
            }
        });

        //TODO Delete booking from calendar integrations
        //TODO Perhaps send emails to user and client to tell about the cancellation

        const deleteBooking = await prisma.booking.delete({
            where: {
                id: bookingToDelete.id,
            },
        });

        res.status(200).json({message: 'Booking deleted successfully'});
    }
}