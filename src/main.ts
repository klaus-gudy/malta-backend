import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api (e.g. /api/customers).
  app.setGlobalPrefix('api');

  // Validate & strip request payloads against the DTOs. stopAtFirstError keeps
  // one clear message per field instead of stacking every failed constraint.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // Allow the Next.js frontend to call the API from the browser.
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });

  await app.listen(process.env.PORT ?? 3030);
}
bootstrap();
