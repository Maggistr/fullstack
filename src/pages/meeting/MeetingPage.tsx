import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { Alert, Box, Button, Divider, Fade, Grow, List, ListItem, ListItemText, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { ApiError } from "@/shared/api/ApiError";
import { Meeting, getMeeting } from "@/entities/meeting";
import { DeadlineText, Task, TaskStatusChip, listTasksByMeeting } from "@/entities/task";
import { AddTaskForm } from "@/features/add-task";
import { DeleteMeetingButton } from "@/features/delete-meeting";
import { DeleteTaskButton } from "@/features/delete-task";
import { EditMeetingDialog } from "@/features/edit-meeting";
import { EditTaskButton } from "@/features/edit-task";
import { TaskStatusSelect } from "@/features/change-task-status";
import AsyncBoundary from "@/shared/ui/AsyncBoundary";
import { formatDate } from "@/shared/lib/date";
import { useAsync } from "@/shared/lib/useAsync";

interface MeetingData {
  meeting: Meeting;
  tasks: Task[];
}

export default function MeetingPage() {
  const { id } = useParams();
  const meetingId = Number(id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const { state, reload, update } = useAsync<MeetingData>(async () => {
    if (!Number.isInteger(meetingId) || meetingId <= 0) throw new ApiError("Собрание не найдено", 404);
    const [meeting, tasks] = await Promise.all([getMeeting(meetingId), listTasksByMeeting(meetingId)]);
    return { meeting, tasks };
  }, [meetingId]);

  return (
    <AsyncBoundary
      state={state}
      onRetry={reload}
      skeleton={
        <Stack spacing={2}>
          <Skeleton variant="text" height={56} width="60%" />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
          <Skeleton variant="rounded" height={140} />
        </Stack>
      }
    >
      {({ meeting, tasks }) => (
        <Stack spacing={2}>
          <Button component={RouterLink} to="/" sx={{ alignSelf: "flex-start" }}>
            ← Все собрания
          </Button>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" useFlexGap spacing={1}>
            <div>
              <Typography variant="h4" component="h1">
                {meeting.title}
              </Typography>
              <Typography color="text.secondary">{formatDate(meeting.date)}</Typography>
            </div>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
                Редактировать
              </Button>
              <DeleteMeetingButton meeting={meeting} onDeleted={() => navigate("/", { replace: true })} />
            </Box>
          </Stack>
          {editing && (
            <EditMeetingDialog
              meeting={meeting}
              open
              onClose={() => setEditing(false)}
              onSaved={(saved) => {
                update((d) => ({ ...d, meeting: saved }));
                setEditing(false);
              }}
            />
          )}

          <Section delay={0} title="Повестка">
            <List dense>
              {meeting.agenda.map((a, i) => (
                <ListItem key={i}>
                  <ListItemText primary={`${i + 1}. ${a}`} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Section delay={100} title="ИИ-резюме">
            {meeting.summary ? (
              <>
                <Typography>{meeting.summary}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1">Решения</Typography>
                <List dense>
                  {meeting.decisions.map((d, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={d} />
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Alert severity="info" variant="outlined">
                Резюме и решения появятся после обработки обсуждения или аудиозаписи.
              </Alert>
            )}
          </Section>

          <Section delay={200} title="Задачи">
            {tasks.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 1 }}>
                Задач по этому собранию пока нет.
              </Typography>
            )}
            <List dense>
              {tasks.map((t) => (
                <Fade key={t.id} in appear>
                  <ListItem
                    divider
                    sx={{ flexWrap: "wrap", gap: 1 }}
                    secondaryAction={undefined}
                  >
                    <ListItemText
                      sx={{ minWidth: 200 }}
                      primary={t.title}
                      secondary={
                        <>
                          {t.assignee}, до <DeadlineText deadline={t.deadline} status={t.status} />
                        </>
                      }
                      secondaryTypographyProps={{ component: "div" }}
                    />
                    <TaskStatusChip status={t.status} />
                    <TaskStatusSelect
                      task={t}
                      onChanged={(updated) =>
                        update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === updated.id ? updated : x)) }))
                      }
                    />
                    <EditTaskButton
                      task={t}
                      onSaved={(updated) =>
                        update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === updated.id ? updated : x)) }))
                      }
                    />
                    <DeleteTaskButton
                      task={t}
                      onDeleted={(removed) => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== removed.id) }))}
                    />
                  </ListItem>
                </Fade>
              ))}
            </List>
            <AddTaskForm
              fixedMeetingId={meeting.id}
              onAdded={(task) => update((d) => ({ ...d, tasks: [...d.tasks, task] }))}
            />
          </Section>
        </Stack>
      )}
    </AsyncBoundary>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <Grow in appear timeout={400 + delay}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {children}
      </Paper>
    </Grow>
  );
}
