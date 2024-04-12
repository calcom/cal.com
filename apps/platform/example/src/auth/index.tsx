import 'server-only'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import NextAuth from 'next-auth'
import type { Session } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Github from 'next-auth/providers/github'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { z } from 'zod'

import { authConfig } from './config'
import { db } from 'prisma/client'
import { User } from '@prisma/client'

async function hash(password: string) {
  return new Promise<string>((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        console.error('Error hashing password', err)
        reject(err)
      }
      resolve(`${salt}.${derivedKey.toString('hex')}`)
    })
  })
}

async function compare(password: string, hash: string) {
  return new Promise<boolean>((resolve, reject) => {
    const [salt, hashKey] = hash.split('.') as [string, string]
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        console.error('Error comparing password', err)
        reject(err)
      }
      resolve(timingSafeEqual(Buffer.from(hashKey, 'hex'), derivedKey))
    })
  })
}

const {
  auth: uncachedAuth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  logger: {
    debug: (message, metadata) => console.debug(message, { metadata }),
    error: (error) => console.error(error),
    warn: (message) => console.warn(message),
  },
  providers: [
    // Github,
    Credentials({
      name: 'Credentials',
      async authorize(c) {
        const credentials = z
          .object({
            email: z.string().min(1).max(32),
            password: z.string().min(6).max(32),
          })
          .safeParse(c);
        
        if (!credentials.success) {
          console.error(`[auth] Invalid sign in submission because of missing credentials: ${credentials.error.errors.map((e) => e.message).join(', ')}`)
          return null
        }

        let user: User | null = null;
        try {
          user = await db.user.findUnique({
            where: {email: credentials.data.email}
          })
          if (user) {
            // if user exists, this comes from our login page, let's check the password
            console.info(`User ${user.id} attempted login with password`)
            if (!user.hashedPassword) {
              console.debug(`OAuth User ${user.id} attempted signin with password`)
              return null
            }
            const pwMatch = await compare(
              credentials.data.password,
              user.hashedPassword,
            )
            if (!pwMatch) {
              console.debug(`User ${user.id} attempted login with bad password`)
              return null
            }
            return { id: user.id, name: user.name }
          } else {
            // if user doesn't exist, this comes from our signup page w/ additional fields
            console.info(`User attempted login`)
            const signupData = z.object({
              username: z.string().min(1).max(32),
              name: z.string().min(1).max(32),
            }).safeParse(c)
            if (!signupData.success) {
              console.error(`[auth] Invalid sign in submission because of missing signup data: ${signupData.error.errors.map((e) => e.message).join(', ')}`)
              return null
            }
            // Signup new user
            user = await db.user.create({
              data: {
                username: signupData.data.username,
                name: signupData.data.name,
                hashedPassword: await hash(credentials.data.password),
                email: credentials.data.email,
              },
            })
          };

          return { id: user.id, name: user.name }
        } catch {
          return null
        }
      },
    }),
  ],
 })

export { signIn, signOut, GET, POST }

export const auth = cache(async () => {
  try {
    return await uncachedAuth()
  } catch (err) {
    console.error('Error fetching session', err)
    return null
  }
})
export const currentUser = cache(async () => {
  const sesh = await auth()
  if (!sesh?.user) redirect('/')
  const user = await db.user.findUnique({
    where: { id: sesh.user.id },
  })
  return user
})

export async function SignedIn(props: {
  children: (props: { user: Session['user'] }) => React.ReactNode
}) {
  const sesh = await auth()
  return sesh?.user ? <>{props.children({ user: sesh.user })}</> : null
}

export async function SignedOut(props: { children: React.ReactNode }) {
  const sesh = await auth()
  return sesh?.user ? null : <>{props.children}</>
}