import type { ValidationError } from 'class-validator';

// Gom câu báo lỗi của mọi trường (kể cả trường lồng nhau như items[0].quantity),
// bỏ tiền tố đường dẫn "items.0." mà ValidationPipe tự ghép, bỏ câu trùng.
export function collectValidationMessages(errors: ValidationError[]): string[] {
  const messages = errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...collectValidationMessages(error.children ?? []),
  ]);
  return [...new Set(messages)];
}