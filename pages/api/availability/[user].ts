import type {NextApiRequest, NextApiResponse} from 'next';
import prisma from '../../../lib/prisma';
import {getBusyCalendarTimes} from '../../../lib/calendarClient';
import {getBusyVideoTimes} from '../../../lib/videoClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
            credentials: true,
            timeZone: true
        }
    });

    const hasCalendarIntegrations = currentUser.credentials.filter((cred) => cred.type.endsWith('_calendar')).length > 0;
    const hasVideoIntegrations = currentUser.credentials.filter((cred) => cred.type.endsWith('_video')).length > 0;

    const calendarAvailability = await getBusyCalendarTimes(currentUser.credentials, req.query.dateFrom, req.query.dateTo);
    const videoAvailability = await getBusyVideoTimes(currentUser.credentials, req.query.dateFrom, req.query.dateTo);

    let commonAvailability = [];

    if(hasCalendarIntegrations && hasVideoIntegrations) {
        commonAvailability = calendarAvailability.filter(availability => videoAvailability.includes(availability));
    } else if(hasVideoIntegrations) {
        commonAvailability = videoAvailability;
    } else if(hasCalendarIntegrations) {
        commonAvailability = calendarAvailability;
    }

    res.status(200).json(commonAvailability);
}
