# Raphaëlle Massage Backend API

Backend API for the Raphaëlle Massage application built with NestJS, providing secure user management, massage service management, and booking system.

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run the complete application with database:

```bash
# Clone and navigate to the project
git clone https://github.com/DamienLandois/block-2-landois-damien-backend.git
cd block-2-landois-damien-backend

# Start the application with Docker Compose
docker-compose up -d --build
```

The API will be available at `http://localhost:3001`

### Option 2: Local Development

For development without Docker:

```bash
# Install dependencies
npm install

# Start the application
npm run start
```

**Note:** This option starts the API server only. You'll need to configure your own database connection.

## 📖 Documentation

Visit: [https://github.com/DamienLandois/documentation-bloc-2-landois-damien](https://github.com/DamienLandois/documentation-bloc-2-landois-damien)

```bash
#pour lancer la documentation
npm start
```


## 🛠️ Available Scripts

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start              # Start application
npm run start:prod         # Start in production mode

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run test:cov           # Run tests with coverage

# Database
npx prisma migrate dev     # Run database migrations
npx prisma studio          # Open Prisma Studio
npx prisma generate        # Generate Prisma client

# Build
npm run build              # Build for production
```

## 🏗️ Tech Stack

- **Framework:** NestJS 11.0.1
- **Database:** MySQL with Prisma ORM
- **Authentication:** JWT with role-based access control
- **Containerization:** Docker & Docker Compose
- **CI/CD:** GitHub Actions with automated versioning

## 🔧 Environment Configuration

The application uses environment variables for configuration. When using Docker Compose, these are automatically configured.

For local development, create a `.env` file with your database configuration.