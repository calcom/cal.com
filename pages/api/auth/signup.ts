import prisma from '../../../lib/prisma';
import { hashPassword } from "../../../lib/auth";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return;
    }

    const data = req.body;

    const { username, email, password } = data;

    if (!email || !email.includes('@') || !password || password.trim().length < 7) {
        res.status(422).json({message: 'Invalid input - password should be at least 7 characters long.'});
        return;
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                {
                    username: username
                },
                {
                    email: email
                }
            ]
        }
    });

    if (existingUser) {
        res.status(422).json({message: 'A user exists with that username or email address'});
        return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword
        }
    });

    res.status(201).json({message: 'Created user'});
}