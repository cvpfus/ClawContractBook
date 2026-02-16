import type { ZodError } from 'zod';

/** Format Zod validation errors into a readable summary and field map. */
export function formatZodError(error: ZodError): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const issues = error.issues ?? [];
  const fieldErrors = issues.reduce<Record<string, string>>((acc, i) => {
    const key = i.path.length ? i.path.join('.') : 'body';
    acc[key] = i.message;
    return acc;
  }, {});
  const summary = Object.entries(fieldErrors)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  return {
    message: `Validation failed: ${summary}`,
    fieldErrors,
  };
}
