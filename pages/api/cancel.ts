import prisma from '../../lib/prisma';
import {createEvent, deleteEvent} from "../../lib/calendarClient";

export default async function handler(req, res) {
    if (req.method == "POST") {
        const uid = req.body.uid;

        const bookingToDelete = await prisma.booking.findFirst({
            where: {
                uid: uid,
            },
            select: {
                id: true,
                user: {
                    select: {
                        credentials: true
                    }
                },
                attendees: true,
                references: true
            }
        });

        const credentials = bookingToDelete.user.credentials[0];

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

        //TODO Perhaps send emails to user and client to tell about the cancellation

        const deleteBooking = await prisma.booking.delete({
            where: {
                id: bookingToDelete.id,
            },
        });

        await deleteEvent(credentials, uid);

        res.status(200).json({message: 'Booking deleted successfully'});
    }
}