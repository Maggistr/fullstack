import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: { primary: { main: "#1565c0" } },
  components: {
    MuiCssBaseline: {
      // Уважаем системную настройку «уменьшить движение»
      styleOverrides: `
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `,
    },
  },
});
