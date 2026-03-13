---
title: Vercel
description: Deploy Cal.diy on Vercel.
---

# Vercel

## Requirements

Currently Vercel Pro Plan is required to be able to Deploy this application with Vercel, due to limitations on the number of serverless functions on the free plan.

You need a PostgresDB database hosted somewhere. [Supabase](https://supabase.com) offer a great free option while [Heroku](https://heroku.com) offers a low-cost option.

## One Click Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcalcom%2Fcal.com&env=DATABASE_URL,NEXT_PUBLIC_WEBAPP_URL,NEXTAUTH_URL,NEXTAUTH_SECRET,CRON_API_KEY,CALENDSO_ENCRYPTION_KEY&envDescription=See%20all%20available%20env%20vars&envLink=https%3A%2F%2Fgithub.com%2Fcalcom%2Fcal.com%2Fblob%2Fmain%2F.env.example&project-name=cal&repo-name=cal.com&build-command=cd%20../..%20%26%26%20yarn%20build&root-directory=apps%2Fweb%2F)

## Manual Deployment

### Local settings

1. **Fork and clone the repository**

```bash
git clone https://github.com/<<your-fork>>/cal.com.git
```

2. **Set environment variables**

Copy the `.env.example` file in the repository root, rename it to `.env` and fill it with your settings (See [manual setup](/installation) and Obtaining the Google API Credentials)

3. **Install packages with yarn**

```bash
yarn install
```

4. **Set up the database using the Prisma schema**

Schema is located in at `packages/prisma/schema.prisma`.

```bash
yarn workspace @calcom/prisma db-deploy
```

5. **Open Prisma Studio**

To look at or modify the database content

```bash
yarn db-studio
```

6. **Open User model**

Click on the `User` model to add a new user record.

7. **Create new user**

Fill out the fields (remembering to encrypt your password with [BCrypt](https://bcrypt-generator.com/)) and click `Save 1 Record` to create your first user.

8. **Login**

Open a browser to port 3000 on your localhost and login with your just created, first user.

> Sometimes, yarn install might fail during deployment on Vercel, in which case, you can use `YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install` as the install command instead.

#### Deployment

1. Create a new project on Vercel
2. Import from your forked repository
3. Set the Environment Variables
4. Set the root directory to `apps/web`
5. Override the build command to:

```bash
cd ../.. && yarn build --include-dependencies --no-deps
```

6. Hit Deploy
