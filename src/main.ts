import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AIleana API')
    .setDescription('AIleana Backend - Payments & Calls API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Wallet')
    .addTag('Payment')
    .addTag('Calls')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = env.PORT || 3000;
  await app.listen(port);

  console.log(`
    🚀 AIleana Backend is running!
    📝 API Documentation: http://localhost:${port}/api/docs
    🔧 Environment: ${env.NODE_ENV}
  `);
}

bootstrap();
