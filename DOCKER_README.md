# Docker
## Build
To build the docker image, do the following:
1. Create a `.env` file with the right values
2. Run `docker-compose build calcom`

Confirm build succeeds, if you run into issues ask the team.

## Deploy
To deploy we use Digital Ocean's `doctl` tool and docker to push to container registry.
1. Install `doctl` [here](https://docs.digitalocean.com/reference/doctl/how-to/install/)
2. Ask the team for DO's token
3. `doctl auth init --context mento`
4. `doctl auth list`, you should see `mento` and `default`
5. `doctl auth switch --context mento`
6. `doctl registry login`
7. `docker tag docker_calcom registry.digitalocean.com/mento/docker_calcom`
8. `docker push registry.digitalocean.com/mento/docker_calcom`
9. Go into DO, select `mento-cal` and from the Actions dropdown, "Force rebuild and redeploy"
