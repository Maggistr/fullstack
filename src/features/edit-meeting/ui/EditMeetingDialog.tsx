import { FormEvent, useState } from "react";
import { Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Meeting, updateMeeting } from "@/entities/meeting";
import StringListEditor from "@/shared/ui/StringListEditor";
import { EditMeetingValues, isEditMeetingValid, validateEditMeeting } from "../model/validation";

interface EditMeetingDialogProps {
  meeting: Meeting;
  open: boolean;
  onClose: () => void;
  onSaved: (meeting: Meeting) => void;
}

/** Редактирование собрания: название, дата, повестка, резюме и решения. */
export default function EditMeetingDialog({ meeting, open, onClose, onSaved }: EditMeetingDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(meeting.date);
  const [summary, setSummary] = useState(meeting.summary);
  const [agenda, setAgenda] = useState(meeting.agenda);
  const [decisions, setDecisions] = useState(meeting.decisions);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values: EditMeetingValues = { title, date, summary, agenda, decisions };
  const errors = validateEditMeeting(values);
  const shown = (field: string) => submitted || touched.has(field);
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (!isEditMeetingValid(errors)) return;

    setSaving(true);
    try {
      const saved = await updateMeeting(meeting.id, {
        title: title.trim(),
        date,
        summary: summary.trim(),
        agenda: agenda.map((x) => x.trim()).filter(Boolean),
        decisions: decisions.map((x) => x.trim()).filter(Boolean),
      });
      onSaved(saved);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="edit-meeting-title"
    >
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle id="edit-meeting-title">Редактирование собрания</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Название"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => touch("title")}
              error={shown("title") && !!errors.title}
              helperText={(shown("title") && errors.title) || " "}
              disabled={saving}
              fullWidth
            />
            <TextField
              label="Дата"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => touch("date")}
              error={shown("date") && !!errors.date}
              helperText={(shown("date") && errors.date) || " "}
              InputLabelProps={{ shrink: true }}
              disabled={saving}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Повестка
              </Typography>
              <StringListEditor
                itemLabel="Пункт"
                addLabel="Добавить пункт"
                initial={meeting.agenda}
                minRows={1}
                onChange={setAgenda}
                onBlur={() => touch("agenda")}
                errors={shown("agenda") ? errors.agendaItems : undefined}
                error={shown("agenda") ? errors.agenda : undefined}
                disabled={saving}
              />
            </Box>

            <TextField
              label="Резюме"
              multiline
              minRows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={() => touch("summary")}
              error={shown("summary") && !!errors.summary}
              helperText={(shown("summary") && errors.summary) || "Необязательно. Позже его сможет подготовить ИИ."}
              disabled={saving}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Решения
              </Typography>
              <StringListEditor
                itemLabel="Решение"
                addLabel="Добавить решение"
                initial={meeting.decisions}
                onChange={setDecisions}
                errors={errors.decisionItems}
                disabled={saving}
              />
            </Box>

            <Collapse in={!!submitError}>
              <Alert severity="error">{submitError}</Alert>
            </Collapse>
            <Collapse in={submitted && !isEditMeetingValid(errors) && !saving}>
              <Alert severity="warning">Исправьте ошибки в форме и повторите сохранение.</Alert>
            </Collapse>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
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
  );
}
