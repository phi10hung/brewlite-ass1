import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // cho phép frontend gọi API
  // Tự kiểm tra dữ liệu gửi lên theo các DTO (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bỏ các field lạ không khai báo trong DTO
      forbidNonWhitelisted: true, // gửi field lạ thì báo lỗi 400
      transform: true,
    }),
  );
  await app.listen(process.env.API_PORT ?? 4000);
}
void bootstrap();
