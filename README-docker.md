# Borg's Calcom Docker

## Requirements

- `docker`
- `docker compose`

## Running

1. Prepare your configuration: Add a `.env` file in the root directory (ask Thomas for this file)
    
2. Start via docker compose
    
    ```bash
    docker compose up -d
    ```

3. Open a browser to [http://localhost](http://localhost), or your defined NEXT_PUBLIC_WEBAPP_URL.

## Updating

1. Stop the Cal.com stack

    ```bash
    docker compose down
    ```

2. Pull the latest changes

    ```bash
    docker compose pull
    ```
3. Update env vars as necessary.
4. Re-start the Cal.com stack

    ```bash
    docker compose up -d
    ```

## Configuration

### Important Run-time variables

These variables must also be provided at runtime

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| CALCOM_LICENSE_KEY | Enterprise License Key | optional |  |
| NEXT_PUBLIC_WEBAPP_URL | Base URL of the site.  NOTE: if this value differs from the value used at build-time, there will be a slight delay during container start (to update the statically built files). | optional | `http://localhost:3000` |
| NEXTAUTH_URL | Location of the auth server. By default, this is the Cal.com docker instance itself. | optional | `{NEXT_PUBLIC_WEBAPP_URL}/api/auth` |
| NEXTAUTH_SECRET | must match build variable | required | `secret` |
| CALENDSO_ENCRYPTION_KEY | must match build variable | required | `secret` |
| DATABASE_URL | database url with credentials | required | `postgresql://unicorn_user:magical_password@database:5432/calendso` |

### Build-time variables

If building the image yourself, these variables must be provided at the time of the docker build, and can be provided by updating the .env file. Currently, if you require changes to these variables, you must follow the instructions to build and publish your own image. 

Updating these variables is not required for evaluation, but is required for running in production. Instructions for generating variables can be found in the [cal.com instructions](https://github.com/calcom/cal.com) 

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| NEXT_PUBLIC_WEBAPP_URL | Base URL injected into static files | optional | `http://localhost:3000` |
| NEXT_PUBLIC_LICENSE_CONSENT | license consent - true/false |  |  |
| CALCOM_TELEMETRY_DISABLED | Allow cal.com to collect anonymous usage data (set to `1` to disable) | | |
| DATABASE_URL | database url with credentials | required | `postgresql://unicorn_user:magical_password@database:5432/calendso` |
| NEXTAUTH_SECRET | Cookie encryption key | required | `secret` |
| CALENDSO_ENCRYPTION_KEY | Authentication encryption key | required | `secret` |

## Git Submodules

This repository uses a git submodule.

For users building their own images, to update the calcom submodule, use the following command:

```bash
git submodule update --remote --init
```

For more advanced usage, please refer to the git documentation: [https://git-scm.com/book/en/v2/Git-Tools-Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)

## Troubleshooting

### SSL edge termination

If running behind a load balancer which handles SSL certificates, you will need to add the environmental variable `NODE_TLS_REJECT_UNAUTHORIZED=0` to prevent requests from being rejected. Only do this if you know what you are doing and trust the services/load-balancers directing traffic to your service.

### Failed to commit changes: Invalid 'prisma.user.create()'

Certain versions may have trouble creating a user if the field `metadata` is empty. Using an empty json object `{}` as the field value should resolve this issue. Also, the `id` field will autoincrement, so you may also try leaving the value of `id` as empty.

### CLIENT_FETCH_ERROR

If you experience this error, it may be the way the default Auth callback in the server is using the WEBAPP_URL as a base url. The container does not necessarily have access to the same DNS as your local machine, and therefor needs to be configured to resolve to itself. You may be able to correct this by configuring `NEXTAUTH_URL=http://localhost:3000/api/auth`, to help the backend loop back to itself.
```
docker-calcom-1  | @calcom/web:start: [next-auth][error][CLIENT_FETCH_ERROR] 
docker-calcom-1  | @calcom/web:start: https://next-auth.js.org/errors#client_fetch_error request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost {
docker-calcom-1  | @calcom/web:start:   error: {
docker-calcom-1  | @calcom/web:start:     message: 'request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost',
docker-calcom-1  | @calcom/web:start:     stack: 'FetchError: request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost\n' +
docker-calcom-1  | @calcom/web:start:       '    at ClientRequest.<anonymous> (/calcom/node_modules/next/dist/compiled/node-fetch/index.js:1:65756)\n' +
docker-calcom-1  | @calcom/web:start:       '    at ClientRequest.emit (node:events:513:28)\n' +
docker-calcom-1  | @calcom/web:start:       '    at ClientRequest.emit (node:domain:489:12)\n' +
docker-calcom-1  | @calcom/web:start:       '    at Socket.socketErrorListener (node:_http_client:494:9)\n' +
docker-calcom-1  | @calcom/web:start:       '    at Socket.emit (node:events:513:28)\n' +
docker-calcom-1  | @calcom/web:start:       '    at Socket.emit (node:domain:489:12)\n' +
docker-calcom-1  | @calcom/web:start:       '    at emitErrorNT (node:internal/streams/destroy:157:8)\n' +
docker-calcom-1  | @calcom/web:start:       '    at emitErrorCloseNT (node:internal/streams/destroy:122:3)\n' +
docker-calcom-1  | @calcom/web:start:       '    at processTicksAndRejections (node:internal/process/task_queues:83:21)',
docker-calcom-1  | @calcom/web:start:     name: 'FetchError'
docker-calcom-1  | @calcom/web:start:   },
docker-calcom-1  | @calcom/web:start:   url: 'http://testing.localhost:3000/api/auth/session',
docker-calcom-1  | @calcom/web:start:   message: 'request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost'
docker-calcom-1  | @calcom/web:start: }
```


<img referrerpolicy="no-referrer-when-downgrade" src="https://static.scarf.sh/a.png?x-pxid=81cda9f7-a102-453b-ac01-51c35650bd70" />
