import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AppBar, Box, Button, Container, Fade, Toolbar, Typography } from "@mui/material";

const NAV_ITEMS = [
  { to: "/", label: "Собрания", end: true },
  { to: "/new", label: "Новое собрание", end: false },
  { to: "/tasks", label: "Задачи", end: false },
];

export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Протоколы собраний
          </Typography>
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.to}
              color="inherit"
              component={NavLink}
              to={item.to}
              end={item.end}
              sx={{
                borderBottom: "2px solid transparent",
                borderRadius: 0,
                transition: "border-color .2s",
                "&.active": { borderBottomColor: "currentColor" },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }} maxWidth="md">
        {/* Плавное появление содержимого при переходе между экранами */}
        <Fade key={pathname} in appear timeout={300}>
          <div>
            <Outlet />
          </div>
        </Fade>
      </Container>
    </Box>
  );
}
