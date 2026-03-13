---
title: AWS
description: Deploy Cal.diy on Amazon Web Services.
---

# AWS

Deploying Cal.diy on AWS

## Manual Deployment

### 1. Prerequisites

1. Amazon Web Services account
2. Familiarity with AWS services and management console
3. Access to the Cal.diy source code

### 2. AWS Environment Setup

1. **Create an AWS Account:** If not already set up, create an account on AWS.
2. **Management Console:** Log in to the AWS Management Console.

### 3. Creating AWS Resources

1. **Create a New IAM User:** Set up an IAM user with the necessary permissions for deploying and managing the application.
2. **Set Up Required Services:** Establish services like Amazon EC2, RDS for PostgreSQL, etc., as needed for your application.

### 4. Configuring Cal.diy

1. **Clone the Repository:** Get the Cal.diy repository onto your local environment.
2. **Update Configuration:** Modify the .env file to include your AWS resource details (like database endpoints).

### 5. Deploying on AWS

1. **Deploy Application:** Utilize AWS services such as EC2 or Elastic Beanstalk to deploy the Cal.diy application.
2. **Database Configuration:** Set up and connect the RDS instance to your application.
3. **Verify Deployment:** Ensure the application is operational and accessible.

### 6. Post-Deployment Steps

1. **DNS Setup:** Update your DNS settings to point to your AWS deployment.
2. **Monitoring and Scaling:** Leverage AWS monitoring tools to keep track of your application's performance and scale resources accordingly.

### Best Practices

1. Regularly update your deployment with the latest Cal.diy releases.
2. Adhere to AWS's recommended security practices.

### Additional Resources

[https://docs.aws.amazon.com/](https://docs.aws.amazon.com/)
