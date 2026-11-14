import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Alert, Link, Typography } from "@mui/material";
import { LoginForm } from "@/features/auth-by-email";
import { useAuth } from "@/entities/user";
import AuthCard from "@/shared/ui/AuthCard";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notice } = useAuth();
  // Куда вернуть пользователя после входа: туда, откуда его перенаправили
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  return (
    <AuthCard title="Вход">
      {notice && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      <LoginForm onSuccess={() => navigate(from, { replace: true })} />
      <Typography sx={{ mt: 2 }} color="text.secondary">
        Нет аккаунта?{" "}
        <Link component={RouterLink} to="/register" state={{ from }}>
          Зарегистрироваться
        </Link>
      </Typography>
    </AuthCard>
  );
}
