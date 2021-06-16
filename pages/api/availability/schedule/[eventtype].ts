import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const session = await getSession({req});
  if (!session) {
    res.status(401).json({message: "Not authenticated"});
    return;
  }

  if (req.method == "PUT") {

    const openingHours = req.body.openingHours || [];
    const overrides = req.body.overrides || [];

    const removeSchedule = await prisma.schedule.deleteMany({
      where: {
        eventTypeId: +req.query.eventtype,
      }
    })

    const updateSchedule = Promise.all(openingHours.map( (schedule) => prisma.schedule.create({
      data: {
        eventTypeId: +req.query.eventtype,
        days: schedule.days,
        startTime: schedule.startTime,
        length: schedule.endTime - schedule.startTime,
      },
    })))
      .catch( (error) => {
        console.log(error);
      })
    }

    res.status(200).json({message: 'Created schedule'});

  /*if (req.method == "PATCH") {
    const openingHours = req.body.openingHours || [];
    const overrides = req.body.overrides || [];

    openingHours.forEach( (schedule) => {
      const updateSchedule = await prisma.schedule.update({
        where: {
          id: req.body.id,
        },
        data: {
          eventTypeId: req.query.eventtype,
          days: req.body.days,
          startTime: 333,
          endTime: 540 - req.body.startTime,
        },
      });
    });

    overrides.forEach( (schedule) => {
      const updateSchedule = await prisma.schedule.update({
        where: {
          id: req.body.id,
        },
        data: {
          eventTypeId: req.query.eventtype,
          startDate: req.body.startDate,
          length: 540,
        },
      });
    });*/
}
