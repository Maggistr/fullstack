import { FormEvent, useState } from "react";
import { Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { Task, TaskFormValues, updateTask, validateTaskForm } from "@/entities/task";
import { hasErrors } from "@/shared/lib/validation";

interface EditTaskButtonProps {
  task: Task;
  onSaved: (task: Task) => void;
}

/** Кнопка-карандаш и диалог редактирования задачи (название, ответственный, дедлайн). */
export default function EditTaskButton({ task, onSaved }: EditTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(toValues(task));
  const [touched, setTouched] = useState<Set<keyof TaskFormValues>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = validateTaskForm(values);
  const error = (f: keyof TaskFormValues) => (submitted || touched.has(f) ? errors[f] : undefined);
  const touch = (f: keyof TaskFormValues) => setTouched((prev) => new Set(prev).add(f));
  const setField = (f: keyof TaskFormValues, value: string) => setValues((prev) => ({ ...prev, [f]: value }));

  const openDialog = () => {
    // Всегда начинаем с актуальных данных задачи
    setValues(toValues(task));
    setTouched(new Set());
    setSubmitted(false);
    setSubmitError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (hasErrors(errors)) return;

    setSaving(true);
    try {
      const saved = await updateTask(task.id, {
        title: values.title.trim(),
        assignee: values.assignee.trim(),
        deadline: values.deadline,
      });
      onSaved(saved);
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось сохранить задачу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Tooltip title="Редактировать задачу">
        <IconButton size="small" aria-label={`Редактировать задачу «${task.title}»`} onClick={openDialog}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={saving ? undefined : () => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="edit-task-title">
        <Box component="form" noValidate onSubmit={handleSubmit}>
          <DialogTitle id="edit-task-title">Редактирование задачи</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Задача"
                required
                value={values.title}
                onChange={(e) => setField("title", e.target.value)}
                onBlur={() => touch("title")}
                error={!!error("title")}
                helperText={error("title") || " "}
                disabled={saving}
                fullWidth
              />
              <TextField
                label="Ответственный"
                required
                value={values.assignee}
                onChange={(e) => setField("assignee", e.target.value)}
                onBlur={() => touch("assignee")}
                error={!!error("assignee")}
                helperText={error("assignee") || " "}
                disabled={saving}
                fullWidth
              />
              <TextField
                label="Дедлайн"
                type="date"
                required
                value={values.deadline}
                onChange={(e) => setField("deadline", e.target.value)}
                onBlur={() => touch("deadline")}
                error={!!error("deadline")}
                helperText={error("deadline") || " "}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
                fullWidth
              />
              <Collapse in={!!submitError}>
                <Alert severity="error">{submitError}</Alert>
              </Collapse>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

const toValues = (task: Task): TaskFormValues => ({
  title: task.title,
  assignee: task.assignee,
  deadline: task.deadline,
  meetingId: task.meetingId,
});
