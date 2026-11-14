import type { FormErrors } from "@/shared/lib/validation";

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues extends LoginFormValues {
  name: string;
  passwordRepeat: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD_LENGTH = 8;

function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Введите email";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "Введите корректный email, например name@example.com";
  return undefined;
}

export function validateLoginForm(values: LoginFormValues): FormErrors<LoginFormValues> {
  const errors: FormErrors<LoginFormValues> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = "Введите пароль";
  return errors;
}

export function validateRegisterForm(values: RegisterFormValues): FormErrors<RegisterFormValues> {
  const errors: FormErrors<RegisterFormValues> = {};

  const name = values.name.trim();
  if (!name) errors.name = "Введите имя";
  else if (name.length < 2) errors.name = "Минимум 2 символа";
  else if (name.length > 100) errors.name = "Не длиннее 100 символов";

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  if (!values.password) errors.password = "Придумайте пароль";
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`;
  else if (values.password.length > 128) errors.password = "Пароль не длиннее 128 символов";

  if (!values.passwordRepeat) errors.passwordRepeat = "Повторите пароль";
  else if (values.passwordRepeat !== values.password) errors.passwordRepeat = "Пароли не совпадают";

  return errors;
}
