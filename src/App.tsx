import { Link as RouterLink, Route, Routes } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingPage from "./pages/MeetingPage";
import NewMeetingPage from "./pages/NewMeetingPage";
import TasksPage from "./pages/TasksPage";

export default function App() {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Протоколы собраний
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">Собрания</Button>
          <Button color="inherit" component={RouterLink} to="/new">Новое собрание</Button>
          <Button color="inherit" component={RouterLink} to="/tasks">Задачи</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }} maxWidth="md">
        <Routes>
          <Route path="/" element={<MeetingsPage />} />
          <Route path="/meetings/:id" element={<MeetingPage />} />
          <Route path="/new" element={<NewMeetingPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="*" element={<Typography>Страница не найдена</Typography>} />
        </Routes>
      </Container>
    </Box>
  );
}
