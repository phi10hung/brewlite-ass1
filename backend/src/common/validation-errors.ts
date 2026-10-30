import type { ValidationError } from 'class-validator';

// Trường lạ (forbidNonWhitelisted): câu mặc định là tiếng Anh nên đổi sang tiếng Việt
function messagesOf(error: ValidationError): string[] {
  return Object.entries(error.constraints ?? {}).map(([rule, message]) =>
    rule === 'whitelistValidation'
      ? `Trường "${error.property}" không hợp lệ`
      : message,
  );
}

// Gom câu báo lỗi của mọi trường (kể cả trường lồng nhau như items[0].quantity),
// bỏ tiền tố đường dẫn "items.0." mà ValidationPipe tự ghép, bỏ câu trùng.
export function collectValidationMessages(errors: ValidationError[]): string[] {
  const messages = errors.flatMap((error) => [
    ...messagesOf(error),
    ...collectValidationMessages(error.children ?? []),
  ]);
  return [...new Set(messages)];
}