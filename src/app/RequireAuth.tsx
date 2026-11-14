import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "@/entities/user";

function FullScreenSpinner() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }} aria-busy="true">
      <CircularProgress aria-label="Проверка сессии" />
    </Box>
  );
}

/** Приватные маршруты: без входа перенаправляет на /login и запоминает, куда вернуться. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenSpinner />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Страницы входа и регистрации: вошедшего пользователя отправляет на главную. */
export function GuestOnly() {
  const { status } = useAuth();
  if (status === "loading") return <FullScreenSpinner />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
