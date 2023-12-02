# Deploy Cal.com

This guides will show you how to deploy cal.com on different providers.
> Note: This guide assumes you have already have account on the provider you want to deploy on.

## Table of content

- [AWS](#aws) 
- [GCP](#gcp)
- [DigitalOcean](#digitalocean)
- [Flightcontrol](#flightcontrol)
- [Railway](#railway)
- [Netlify](#netlify)

## AWS

### Step 1: Create your EC2 instance

1. Go to your AWS console and click on EC2.
2. Click on Launch Instance.
3. Select the machine you want to use. (We are using Ubuntu 20.04 here)
4. Select the instance type you want to use. (We are using t2.micro here)
5. Click on Review and Launch.

### Step 2: Configure your EC2 instance

1. Click on Launch.
2. Select the key pair you want to use. (We are using an existing key pair here)
3. Click on Launch Instances.

### Step 3: Connect to your EC2 instance

1. Go to your AWS console and click on EC2.
2. Click on Running Instances.
3. Select the instance you want to connect to.
4. Click on Connect.

### Step 4: Install Docker

We are going to use Docker to deploy our application. 
> Note: We are assuming you have already installed Docker on your machine.

1. Pull the Docker image from Docker Hub.
```bash
docker pull cal/cal.com
```
2. Run the Docker image.
```bash
docker run -d -p 80:80 cal/cal.com
```
3. Go to your browser and type in your EC2 instance's public IP address.
4. You should see the cal.com homepage.

## GCP