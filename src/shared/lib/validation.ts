/** Ошибки формы: ключ — имя поля, значение — текст ошибки. Пустой объект — форма корректна. */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

export function hasErrors<T>(errors: FormErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
