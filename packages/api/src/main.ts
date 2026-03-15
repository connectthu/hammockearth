import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: [
      process.env.NEXT_PUBLIC_APP_URL ?? "https://hammock.earth",
      process.env.ADMIN_APP_URL ?? "https://admin.hammock.earth",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
