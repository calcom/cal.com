import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import Success from "pages/success";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["GET", "DELETE"].includes(req.method!)) {
    return res.status(405).end();
  }

  // Check that user is authenticated
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  if (req.method === "GET") {
    const credentials = await prisma.credential.findMany({
      where: {
        userId: session.user?.id,
      },
      select: {
        type: true,
      },
    });

    res.status(200).json(credentials);
  }

  if (req.method == "DELETE") {

    /** Get the id from the stripe_payment credential for this user */
    const userIdSession = session?.user?.id;
    const paymentCredential = await prisma.credential.findFirst({
      where: {
        userId: userIdSession,
        type: "stripe_payment",
      },
      select: {
        id: true
      }
    });
    const id = req.body.id;

    await prisma.user.update({
      where: {
        id: userIdSession,
      },
      data: {
        credentials: {
          delete: {
            id,
          },
        },
      },
    });


    /** This validates if you disconnect the Stripe credential.
     When you disconnect this credential, you have to delete the information from payment 
     and then update the booking status to Rejected, this is just for those booking that are unconfirmed and 
     unpaid*/
    if (paymentCredential.id === id) {
      try {
        const bookingWithPayment = await prisma.booking.findMany({
          where: {
            userId: userIdSession,
            paid: false,
            NOT: {
              payment: {
                every: {
                  booking: null

                }
              }
            }

          },
          select: {
            id: true,
          },
        }).then((bookings) => bookings.map((booking) => booking.id));
        const deletePayments = prisma.payment.deleteMany({
          where: {
            bookingId: {
              in: bookingWithPayment,
            },
            success: false
          }
        });

        const updateBookings = prisma.booking.updateMany({
          where: {
            id: {
              in: bookingWithPayment
            },
          },
          data: {
            rejected: true,
            status: 'REJECTED',
            rejectionReason: 'There is not an integration payment',

          },
        });

        const bookingReferences = await prisma.booking.findMany({
          where: {
            confirmed: true,
            rejected: false
          },
          select: {
            id: true
          }
        }).then((bookings) => bookings.map((booking) => booking.id));

        const deleteBookingReferences = prisma.bookingReference.deleteMany({
          where: {
            bookingId: {
              in: bookingReferences
            }
          }
        });

        await prisma.$transaction([deletePayments, updateBookings, deleteBookingReferences]);

      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Integration can not be deleted" });

      }
    }
    res.status(200).json({ message: "Integration deleted successfully" });
  }
}
