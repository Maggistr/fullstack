import { FormEvent, useState } from "react";
import { Alert, Box, Button, CircularProgress, Collapse, MenuItem, Paper, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Task, createTask } from "@/entities/task";
import { hasErrors } from "@/shared/lib/validation";
import { TaskFormValues, validateTaskForm } from "../model/validation";

interface AddTaskFormProps {
  /** Если задан, задача создаётся для этого собрания и выбор собрания скрыт. */
  fixedMeetingId?: number;
  /** Собрания для выбора (нужны, когда fixedMeetingId не задан). */
  meetingOptions?: { id: number; title: string }[];
  onAdded: (task: Task) => void;
}

const emptyValues = (fixedMeetingId?: number): TaskFormValues => ({
  title: "",
  assignee: "",
  deadline: "",
  meetingId: fixedMeetingId ?? "",
});

export default function AddTaskForm({ fixedMeetingId, meetingOptions = [], onAdded }: AddTaskFormProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(emptyValues(fixedMeetingId));
  const [touched, setTouched] = useState<Set<keyof TaskFormValues>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = validateTaskForm(values);
  const shown = (field: keyof TaskFormValues) => submitted || touched.has(field);
  const error = (field: keyof TaskFormValues) => (shown(field) ? errors[field] : undefined);

  const setField = <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) =>
    setValues((prev) => ({ ...prev, [field]: value }));
  const touch = (field: keyof TaskFormValues) => setTouched((prev) => new Set(prev).add(field));

  const reset = () => {
    setValues(emptyValues(fixedMeetingId));
    setTouched(new Set());
    setSubmitted(false);
    setSubmitError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (hasErrors(errors) || values.meetingId === "") return;

    setSaving(true);
    try {
      const task = await createTask({
        title: values.title.trim(),
        assignee: values.assignee.trim(),
        deadline: values.deadline,
        meetingId: values.meetingId,
      });
      onAdded(task);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Button
        variant={open ? "text" : "outlined"}
        startIcon={open ? <CloseIcon /> : <AddIcon />}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Отменить" : "Добавить задачу"}
      </Button>

      <Collapse in={open} unmountOnExit>
        <Paper variant="outlined" component="form" noValidate onSubmit={handleSubmit} sx={{ p: 2, mt: 1.5 }}>
          <Stack spacing={2}>
            <TextField
              label="Задача"
              required
              size="small"
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              onBlur={() => touch("title")}
              error={!!error("title")}
              helperText={error("title") || " "}
              disabled={saving}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Ответственный"
                required
                size="small"
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
                size="small"
                value={values.deadline}
                onChange={(e) => setField("deadline", e.target.value)}
                onBlur={() => touch("deadline")}
                error={!!error("deadline")}
                helperText={error("deadline") || " "}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
                fullWidth
              />
            </Stack>
            {fixedMeetingId === undefined && (
              <TextField
                select
                label="Собрание"
                required
                size="small"
                value={values.meetingId}
                onChange={(e) => setField("meetingId", Number(e.target.value))}
                onBlur={() => touch("meetingId")}
                error={!!error("meetingId")}
                helperText={error("meetingId") || " "}
                disabled={saving}
                fullWidth
              >
                {meetingOptions.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.title}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Collapse in={!!submitError}>
              <Alert severity="error">{submitError}</Alert>
            </Collapse>
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {saving ? "Сохранение…" : "Создать задачу"}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Collapse>
    </Box>
  );
}
