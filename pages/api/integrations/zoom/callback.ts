import type {NextApiRequest, NextApiResponse} from 'next';
import {getSession} from "next-auth/client";
import prisma from "../../../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

const scopes = ['meeting:write:admin', 'meeting:write', 'meeting:read:admin', 'meeting:read'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;

    // Check that user is authenticated
    const session = await getSession({req: req});

    if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

    const redirectUri = encodeURI(process.env.BASE_URL + '/api/integrations/zoom/callback');
    const authUrl = 'https://zoom.us/oauth/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectUri;
    const authHeader = 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64');

    // Convert to token
    const options = {
        method: 'POST',
        qs: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: authUrl
        },
        headers: {
            Authorization: authHeader
        }
    };

    return new Promise( (resolve, reject) => fetch('https://zoom.us/oauth/token', options)
      .then((res) => res.text())
      .then((text) => {
          console.log(text);
          const credential = await prisma.credential.create({
              data: {
                  type: 'google_calendar',
                  key: 'lel',
                  userId: session.user.id
              }
          });

          res.redirect('/integrations');
          resolve();
      })
      .catch((err) => {
          if (err) throw new Error(err);
      }));
}