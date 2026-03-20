import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { WinstonLogger } from "./common/logger/winston.logger";

async function bootstrap() {
  const logger = new WinstonLogger();
  const app = await NestFactory.create(AppModule, { logger });
  const normalizeOrigin = (value?: string) =>
    value?.trim().replace(/\/$/, "");

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  console.log("CORS: FRONTEND_URL configurado como:", process.env.FRONTEND_URL);
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",")
            .map((entry) => normalizeOrigin(entry))
            .filter(Boolean)
        : [];
      const requestOrigin = normalizeOrigin(origin);

      if (
        !requestOrigin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(requestOrigin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

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
    `🗳️  VotoRápido API corriendo en http://localhost:${port}`,
    "Bootstrap",
  );
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`, "Bootstrap");
}
bootstrap();
