import type {NextApiRequest, NextApiResponse} from 'next';
import {getSession} from 'next-auth/client';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({req: req});
    if (!session) {
        res.status(401).json({message: "Not authenticated"});
        return;
    }

    if (req.method == "PATCH" || req.method == "POST") {

        const data = {
            title: req.body.title,
            slug: req.body.slug,
            description: req.body.description,
            length: parseInt(req.body.length),
            hidden: req.body.hidden,
            locations: req.body.locations,
            eventName: req.body.eventName,
            startDate: req.body.dates.start,
            endDate: req.body.dates.end,
            customInputs: !req.body.customInputs
              ? undefined
              : {
                  deleteMany: {
                      eventTypeId: req.body.id,
                      NOT: {
                          id: {in: req.body.customInputs.filter(input => !!input.id).map(e => e.id)}
                      }
                  },
                  createMany: {
                      data: req.body.customInputs.filter(input => !input.id).map(input => ({
                          type: input.type,
                          label: input.label,
                          required: input.required
                      }))
                  },
                  update: req.body.customInputs.filter(input => !!input.id).map(input => ({
                      data: {
                          type: input.type,
                          label: input.label,
                          required: input.required
                      },
                      where: {
                          id: input.id
                      }
                  }))
              },
        };

        const { availibility } = req.body;

        if (req.method == "POST") {
            const createEventType = await prisma.eventType.create({
                data: {
                    userId: session.user.id,
                    ...data,
                },
            });

            const createAsync = async (eventTypeId, dayIndex, slotIndex) => prisma.availibility.create({
                data: {
                    eventTypeId,
                    day: availibility[dayIndex].day,
                    startHour: availibility[dayIndex].slotsOfDay[slotIndex].startTime,
                    endHour: availibility[dayIndex].slotsOfDay[slotIndex].endTime,
                }
            })

            const createAvailibility = async () => {
                return Promise.all(availibility
                    .map((el, dayIndex) => 
                        el.slotsOfDay
                        .map((slot, slotIndex) => {
                            createAsync(createEventType.id, dayIndex, slotIndex)
                        })
                    )
                )
            }

            createAvailibility()

            res.status(200).json({message: 'Event created successfully'});
        }
        else if (req.method == "PATCH") {
            const updateEventType = await prisma.eventType.update({
                where: {
                    id: req.body.id,
                },
                data,
            });
            res.status(200).json({message: 'Event updated successfully'});
        }
    }

    if (req.method == "DELETE") {

        const deleteEventType = await prisma.eventType.delete({
            where: {
                id: req.body.id,
            },
        });

        res.status(200).json({message: 'Event deleted successfully'});
    }
}
