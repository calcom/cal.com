# Exchange On-Premise Fix for Cal.com

This directory contains a fix for integrating Cal.com with Microsoft Exchange 2016 and 2019 on-premise servers.

## Issue Description

When trying to connect to Exchange 2016 or 2019 on-premise servers, users may encounter the following errors:
- `401 Unauthorized` with basic authentication
- `error:0308010C:digital envelope routines::unsupported` with NTLM authentication

This is due to OpenSSL compatibility issues with the NTLM authentication used by Exchange.

## Solution

### Option 1: Add Environment Variable to Docker

The simplest fix is to add the `--openssl-legacy-provider` flag to the `NODE_OPTIONS` environment variable in your Docker Compose file:

```yaml
version: '3'
services:
  calcom:
    image: calcom/cal.com:latest
    environment:
      - NODE_OPTIONS=--openssl-legacy-provider
      # ... other environment variables
```

### Option 2: Use the Custom Docker Image

Alternatively, you can use the custom Dockerfile in this directory:

1. Build the custom image:
```bash
docker build -t calcom/cal-exchange-fix:latest -f exchange-fix.Dockerfile .
```

2. Update your docker-compose.yml to use this image instead:
```yaml
version: '3'
services:
  calcom:
    image: calcom/cal-exchange-fix:latest
    # ... other configuration
```

## Exchange 2019 Support

The latest release of Cal.com (v4.5.10+) includes support for Exchange 2019 in addition to Exchange 2016. When connecting to Exchange 2019, make sure to:

1. Select "Microsoft Exchange" when adding a calendar
2. Choose "Exchange 2019" from the version dropdown
3. Use the appropriate authentication method for your Exchange server

## Troubleshooting

If you continue to experience connection issues:

1. Check that your Exchange EWS URL is correct (typically `https://your-exchange-server/EWS/Exchange.asmx`)
2. Verify your username and password credentials
3. Ensure that your Exchange server allows EWS connections
4. Check that your Exchange server's SSL/TLS certificate is valid

For further assistance, please refer to the [GitHub issue #8123](https://github.com/calcom/cal.com/issues/8123) 