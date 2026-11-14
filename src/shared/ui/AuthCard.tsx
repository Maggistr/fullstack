import { ReactNode } from "react";
import { Box, Grow, Paper, Typography } from "@mui/material";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

/** Каркас экранов входа и регистрации: заголовок приложения и карточка с формой по центру. */
export default function AuthCard({ title, children }: AuthCardProps) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
      <Grow in appear timeout={400}>
        <Paper sx={{ p: { xs: 2.5, sm: 4 }, width: "100%", maxWidth: 420 }}>
          <Typography variant="subtitle1" color="primary" fontWeight={600}>
            Протоколы собраний
          </Typography>
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          {children}
        </Paper>
      </Grow>
    </Box>
  );
}
