# Calendso (Docker-Compose)

> Note: Make sure you have docker & docker-compose installed on the server / system

## Generating Docker Image

As the Docker Image is not available on Docker Hub yet, you can easily compile using the Dockerfile

```bash
# cd to root directory of Project
cd ..
docker build -t calendso .
```

- Once Docker Image is generated, you can setup your Google API Key.
- Put your Google OAuth2 Credentials JSON into `SECRET_KEY_HERE` of `docker-compose.yml` file 

## Start Container / Usage

```bash
docker-compose up -d
```


## Use the following to add new users.
```sh
docker ps

## Copy docker container ID of calends:latest
docker exec -it [CONTAINER_ID] /bin/sh
./startUp.sh 
```
> Prisma Studio Started on Port 5555 | CTRL + c to stop & `exit` 

## Stop Containers
```bash
docker-compose down
```


