import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const rawCorsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173';

  // Global Validation Pipe with strict whitelisting and auto-transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configure CORS for allowed origins
  const allowedOrigins =
    rawCorsOrigin === '*'
      ? '*'
      : rawCorsOrigin.split(',').map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Backend Application listening on port ${port}`);
  logger.log(`Allowed CORS origins: ${JSON.stringify(allowedOrigins)}`);
}

bootstrap();
