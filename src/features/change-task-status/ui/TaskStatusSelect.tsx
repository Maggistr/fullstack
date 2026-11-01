import { useState } from "react";
import { Alert, CircularProgress, MenuItem, Select, Snackbar, Stack } from "@mui/material";
import { TASK_STATUSES, TASK_STATUS_LABEL, Task, TaskStatus, updateTaskStatus } from "@/entities/task";

interface TaskStatusSelectProps {
  task: Task;
  onChanged: (task: Task) => void;
}

/** Выпадающий список статуса задачи: показывает ход запроса и сообщает об ошибке. */
export default function TaskStatusSelect({ task, onChanged }: TaskStatusSelectProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (status: TaskStatus) => {
    if (status === task.status) return;
    setPending(true);
    try {
      onChanged(await updateTaskStatus(task.id, status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setPending(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Select
        size="small"
        value={task.status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as TaskStatus)}
        inputProps={{ "aria-label": `Статус задачи «${task.title}»` }}
        sx={{ minWidth: 130 }}
      >
        {TASK_STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {TASK_STATUS_LABEL[s]}
          </MenuItem>
        ))}
      </Select>
      {pending && <CircularProgress size={16} />}
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
