# Database Setup Instructions

## Prerequisites
- Docker Desktop installed and running
- Node.js and Yarn installed

## Setup Steps

1. **Start the PostgreSQL database using Docker**:
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations**:
   ```bash
   yarn workspace @calcom/prisma db-deploy
   ```

3. **Start the development server**:
   ```bash
   yarn dev
   ```

4. **Access the application**:
   - Open [http://localhost:3000](http://localhost:3000) in your browser

## Troubleshooting
- If you get a database connection error, ensure Docker is running
- The default database configuration uses PostgreSQL on `localhost:5450`
- Check the database logs with: `docker-compose logs -f postgres`
