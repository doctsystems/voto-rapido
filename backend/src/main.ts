import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { WinstonLogger } from "./common/logger/winston.logger";

async function bootstrap() {
  const logger = new WinstonLogger();
  const app = await NestFactory.create(AppModule, { logger });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: process.env.FRONTEND_URL || "*" });

  const config = new DocumentBuilder()
    .setTitle("VotoRápido API")
    .setDescription(
      "Sistema de conteo rápido de votos para autoridades locales y regionales",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(
    `🗳️  VotoRápido API corriendo en https://nest-backend-321405220875.us-central1.run.app`,
    "Bootstrap",
  );
  logger.log(`📚 Swagger docs: https://nest-backend-321405220875.us-central1.run.app/api/docs/`, "Bootstrap");
}
bootstrap();
