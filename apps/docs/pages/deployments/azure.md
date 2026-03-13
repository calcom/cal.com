---
title: Azure
description: Deploy Cal.diy on Microsoft Azure.
---

# Azure

Deploying Cal.diy on Azure

## One Click Deployment

> **Note:** A one-click Azure deployment template is not yet available for Cal.diy. Please follow the manual deployment steps below.

## Manual Deployment

### 1. Prerequisites

1. Microsoft Azure account
2. Basic knowledge of Azure services
3. Access to Cal.diy source code

### 2. Azure Setup

1. **Create an Azure Account**
2. **Azure Portal:** Familiarize yourself with the Azure Portal.

### 3. Creating Azure Resources

1. **Creating Azure Resources:** In the Azure Portal, create a new resource group for your Cal.diy project.
2. **Create Azure Services:** Set up required services such as Azure App Service, Azure Database for PostgreSQL, etc.

#### Create Web App

#### Setup Database, Networking

#### Setup Monitoring

### 4. Configuring Cal.diy

1. **Clone Repository:** Clone the Cal.diy repository to your local machine.
2. **Configuration Files:** Update the .env file with necessary Azure configurations (e.g., database connection strings).

### 5. Deploying on Azure

1. **Deploying Web App:** Use Azure App Service to deploy the Cal.diy web application.
2. **Database Setup:** Deploy and configure the Azure Database for PostgreSQL with Cal.diy.
3. **Deployment Verification:** Ensure that the application is running smoothly post-deployment.

### 6. Post-Deployment Steps

1. **DNS Configuration:** Configure your DNS settings to point to the Azure deployment.
2. **Monitor and Scale:** Utilize Azure monitoring tools to keep track of performance and scale resources as needed.
