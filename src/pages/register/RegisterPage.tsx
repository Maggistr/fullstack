import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Link, Typography } from "@mui/material";
import { RegisterForm } from "@/features/auth-by-email";
import AuthCard from "@/shared/ui/AuthCard";

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  return (
    <AuthCard title="Регистрация">
      <RegisterForm onSuccess={() => navigate(from, { replace: true })} />
      <Typography sx={{ mt: 2 }} color="text.secondary">
        Уже есть аккаунт?{" "}
        <Link component={RouterLink} to="/login" state={{ from }}>
          Войти
        </Link>
      </Typography>
    </AuthCard>
  );
}
