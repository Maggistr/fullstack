import { FormEvent, useState } from "react";
import { Alert, Box, Button, CircularProgress, Collapse, Stack, TextField } from "@mui/material";
import { ApiError } from "@/shared/api/ApiError";
import { hasErrors } from "@/shared/lib/validation";
import { useAuth } from "@/entities/user";
import { LoginFormValues, validateLoginForm } from "../model/validation";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [touched, setTouched] = useState<Set<keyof LoginFormValues>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = validateLoginForm(values);
  const error = (field: keyof LoginFormValues) => (submitted || touched.has(field) ? errors[field] : undefined);
  const touch = (field: keyof LoginFormValues) => setTouched((prev) => new Set(prev).add(field));
  const setField = (field: keyof LoginFormValues, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (hasErrors(errors)) return;

    setSaving(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      onSuccess();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 401
          ? "Неверный email или пароль"
          : err instanceof Error
            ? err.message
            : "Не удалось войти",
      );
      setSaving(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={() => touch("email")}
          error={!!error("email")}
          helperText={error("email") || " "}
          disabled={saving}
          fullWidth
        />
        <TextField
          label="Пароль"
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={(e) => setField("password", e.target.value)}
          onBlur={() => touch("password")}
          error={!!error("password")}
          helperText={error("password") || " "}
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
          {saving ? "Вход…" : "Войти"}
        </Button>
      </Stack>
    </Box>
  );
}
