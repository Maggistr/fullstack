import { FormEvent, useState } from "react";
import { Alert, Box, Button, CircularProgress, Collapse, Stack, TextField } from "@mui/material";
import { ApiError } from "@/shared/api/ApiError";
import { hasErrors } from "@/shared/lib/validation";
import { useAuth } from "@/entities/user";
import { MIN_PASSWORD_LENGTH, RegisterFormValues, validateRegisterForm } from "../model/validation";

interface RegisterFormProps {
  onSuccess: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register } = useAuth();
  const [values, setValues] = useState<RegisterFormValues>({ name: "", email: "", password: "", passwordRepeat: "" });
  const [touched, setTouched] = useState<Set<keyof RegisterFormValues>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Ошибка, пришедшая с сервера для конкретного поля (например, email уже занят). */
  const [serverEmailError, setServerEmailError] = useState<string | null>(null);

  const errors = validateRegisterForm(values);
  const shown = (field: keyof RegisterFormValues) => submitted || touched.has(field);
  const error = (field: keyof RegisterFormValues) => (shown(field) ? errors[field] : undefined);
  const touch = (field: keyof RegisterFormValues) => setTouched((prev) => new Set(prev).add(field));
  const setField = (field: keyof RegisterFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field === "email") setServerEmailError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (hasErrors(errors)) return;

    setSaving(true);
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setServerEmailError(err.message);
      else setSubmitError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
      setSaving(false);
    }
  };

  const emailError = error("email") || serverEmailError || undefined;

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Имя"
          autoComplete="name"
          autoFocus
          required
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          onBlur={() => touch("name")}
          error={!!error("name")}
          helperText={error("name") || " "}
          disabled={saving}
          fullWidth
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={() => touch("email")}
          error={!!emailError}
          helperText={emailError || " "}
          disabled={saving}
          fullWidth
        />
        <TextField
          label="Пароль"
          type="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={(e) => setField("password", e.target.value)}
          onBlur={() => touch("password")}
          error={!!error("password")}
          helperText={error("password") || `Минимум ${MIN_PASSWORD_LENGTH} символов`}
          disabled={saving}
          fullWidth
        />
        <TextField
          label="Повторите пароль"
          type="password"
          autoComplete="new-password"
          required
          value={values.passwordRepeat}
          onChange={(e) => setField("passwordRepeat", e.target.value)}
          onBlur={() => touch("passwordRepeat")}
          error={!!error("passwordRepeat")}
          helperText={error("passwordRepeat") || " "}
          disabled={saving}
          fullWidth
        />
        <Collapse in={!!submitError}>
          <Alert severity="error">{submitError}</Alert>
        </Collapse>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {saving ? "Регистрация…" : "Зарегистрироваться"}
        </Button>
      </Stack>
    </Box>
  );
}
