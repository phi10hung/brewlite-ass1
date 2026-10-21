import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // cho phép frontend gọi API
  await app.listen(process.env.API_PORT ?? 4000);
}
void bootstrap();