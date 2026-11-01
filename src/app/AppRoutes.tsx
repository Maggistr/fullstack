import { Link as RouterLink, Route, Routes } from "react-router-dom";
import { Button, Stack, Typography } from "@mui/material";
import { MeetingPage } from "@/pages/meeting";
import { MeetingsPage } from "@/pages/meetings";
import { NewMeetingPage } from "@/pages/new-meeting";
import { TasksPage } from "@/pages/tasks";
import AppLayout from "./AppLayout";

function NotFound() {
  return (
    <Stack alignItems="flex-start" spacing={2}>
      <Typography variant="h4" component="h1">
        Страница не найдена
      </Typography>
      <Button variant="contained" component={RouterLink} to="/">
        К списку собраний
      </Button>
    </Stack>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MeetingsPage />} />
        <Route path="/meetings/:id" element={<MeetingPage />} />
        <Route path="/new" element={<NewMeetingPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
