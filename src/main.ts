require('dotenv').config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Flutter Web app
  // Use custom origin function to handle dynamic ports (Flutter Web uses random ports)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Allow all localhost and 127.0.0.1 origins (development)
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://localhost:') ||
        origin.startsWith('https://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      // Allow production Render domains
      if (
        origin === 'https://animal-rescue-uq1d.onrender.com' ||
        origin.match(/\.onrender\.com$/)
      ) {
        return callback(null, true);
      }

      // Deny all other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
    maxAge: 3600,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
