git submodule deinit --all
heroku plugins:install https://github.com/heroku/heroku-repo.git
heroku repo:reset -a  ikacalendar


git push heroku experimental:main 

yarn build

docker build --build-arg APP_ENV=production . -t app
docker build . -t app 

docker run  -it app sh   


DATABASE_URL
NEXTAUTH_SECRET
CALENDSO_ENCRYPTION_KEY
NEXT_PUBLIC_LICENSE_CONSENT
NEXT_PUBLIC_WEBSITE_URL
NEXT_PUBLIC_EMBED_LIB_URL
NEXTAUTH_DOMAIN
NEXTAUTH_URL
NEXTAUTH_COOKIE_DOMAIN
NEXT_PUBLIC_WEBSITE_URL

-----

Set up sendgroid:

Need to set 
EMAIL_FROM and friends


------
Google 

Redirect URL is incorrect, should include
http://localhost:5000/api/auth/callback/google

Add yourself as test user https://www.reddit.com/r/homeassistant/comments/komsi7/google_calendar_setup_access_denied/
----- 


## Deploy

## One time setup

```
heroku git:remote -a ikacalendar
heroku stack:set container
```

## Docker Locally

```
docker build --build-arg ENV=production . -t app
docker run -p 5000:5000 app
```

```
docker run -e NODE_ENV=production -it app sh
```

```
open localhost:5000
```

## Push to heroku

```
heroku container:login
```

### Prod

Simulate local build
```
docker build --build-arg APP_ENV=production . -t app
```

```
heroku git:remote -a ikacalendar
heroku container:push web --arg APP_ENV=production
heroku container:release web
```


## FAQ

### Space clean up

If you get

```
failed to copy files: copy file range failed: no space left on device
```

Check current usage

```
docker system df
docker image ls
docker container ls -s
docker system prune -a --volumes
```

Clean up

```
docker system prune --all --force
```

## Helpers


find . -type f -exec grep -H 'localhost' {} \;
find . -type f -exec grep -H 'ikacale' {} \;