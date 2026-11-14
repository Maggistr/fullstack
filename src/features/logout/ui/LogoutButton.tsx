import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/entities/user";

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <Button
      color="inherit"
      onClick={handleClick}
      disabled={pending}
      startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
    >
      Выйти
    </Button>
  );
}
