import { useParams } from "react-router-dom";
import { Chip, Divider, List, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { meetings, tasks } from "../data";

export default function MeetingPage() {
  const { id } = useParams();
  const meeting = meetings.find((m) => m.id === Number(id));
  if (!meeting) return <Typography>Собрание не найдено</Typography>;
  const meetingTasks = tasks.filter((t) => t.meetingId === meeting.id);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{meeting.title}</Typography>
      <Typography color="text.secondary">{meeting.date}</Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Повестка</Typography>
        <List dense>
          {meeting.agenda.map((a, i) => (
            <ListItem key={i}><ListItemText primary={`${i + 1}. ${a}`} /></ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">ИИ-резюме</Typography>
        <Typography>{meeting.summary}</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle1">Решения</Typography>
        <List dense>
          {meeting.decisions.map((d, i) => (
            <ListItem key={i}><ListItemText primary={d} /></ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Задачи</Typography>
        <List dense>
          {meetingTasks.map((t) => (
            <ListItem key={t.id}>
              <ListItemText primary={t.title} secondary={`${t.assignee}, до ${t.deadline}`} />
              <Chip size="small" color={t.done ? "success" : "warning"} label={t.done ? "Готово" : "В работе"} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Stack>
  );
}
