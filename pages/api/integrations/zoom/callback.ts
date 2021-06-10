import type {NextApiRequest, NextApiResponse} from 'next';

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

const scopes = ['meeting:write:admin', 'meeting:write', 'meeting:read:admin', 'meeting:read'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;
    console.log(code);
    // Check that user is authenticated
    /*const session = await getSession({req: req});

    if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

    // TODO Init some sort of oAuth client here

    // Convert to token
    /*return new Promise( (resolve, reject) => oAuth2Client.getToken(code, async (err, token) => {
        if (err) return console.error('Error retrieving access token', err);

        const credential = await prisma.credential.create({
            data: {
                type: 'google_calendar',
                key: token,
                userId: session.user.id
            }
        });

        res.redirect('/integrations');
        resolve();
    }));*/
    res.redirect('/integrations');
}