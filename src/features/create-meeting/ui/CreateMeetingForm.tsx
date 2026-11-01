import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Collapse, FormHelperText, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { TransitionGroup } from "react-transition-group";
import { Meeting, createMeeting } from "@/entities/meeting";
import { todayIso } from "@/shared/lib/date";
import { isMeetingFormValid, MeetingFormValues, validateMeetingForm } from "../model/validation";

interface CreateMeetingFormProps {
  onCreated: (meeting: Meeting) => void;
}

interface AgendaRow {
  key: number;
  text: string;
}

export default function CreateMeetingForm({ onCreated }: CreateMeetingFormProps) {
  const nextKey = useRef(2);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<AgendaRow[]>([{ key: 1, text: "" }]);
  const [audio, setAudio] = useState<File | null>(null);

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values: MeetingFormValues = { title, date, agenda: rows.map((r) => r.text), audio };
  const errors = useMemo(() => validateMeetingForm(values), [title, date, rows, audio]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));
  const shown = (field: string) => submitted || touched.has(field);

  const addRow = () => setRows((prev) => [...prev, { key: nextKey.current++, text: "" }]);
  const removeRow = (key: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  const changeRow = (key: number, text: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, text } : r)));

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    setAudio(e.target.files?.[0] ?? null);
    touch("audio");
    e.target.value = "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (!isMeetingFormValid(errors)) return;

    setSaving(true);
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        date,
        agenda: rows.map((r) => r.text.trim()).filter(Boolean),
        audioName: audio?.name ?? null,
      });
      onCreated(meeting);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось сохранить собрание");
      setSaving(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
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
          <TransitionGroup>
            {rows.map((row, index) => (
              <Collapse key={row.key}>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ pb: 1.5 }}>
                  <TextField
                    label={`Пункт ${index + 1}`}
                    value={row.text}
                    onChange={(e) => changeRow(row.key, e.target.value)}
                    onBlur={() => touch("agenda")}
                    error={shown("agenda") && !!errors.agendaItems[index]}
                    helperText={shown("agenda") ? errors.agendaItems[index] : undefined}
                    disabled={saving}
                    size="small"
                    fullWidth
                  />
                  <IconButton
                    aria-label={`Удалить пункт ${index + 1}`}
                    onClick={() => removeRow(row.key)}
                    disabled={saving || rows.length === 1}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Collapse>
            ))}
          </TransitionGroup>
          {shown("agenda") && errors.agenda && <FormHelperText error>{errors.agenda}</FormHelperText>}
          <Button startIcon={<AddIcon />} onClick={addRow} disabled={saving} sx={{ mt: 0.5 }}>
            Добавить пункт
          </Button>
        </Box>

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={saving}>
              Загрузить аудиозапись
              <input type="file" accept="audio/*" hidden onChange={handleFile} />
            </Button>
            {audio && <Chip label={audio.name} onDelete={() => setAudio(null)} disabled={saving} />}
          </Stack>
          {errors.audio && <FormHelperText error>{errors.audio}</FormHelperText>}
          <FormHelperText>Необязательно. Файл до 50 МБ; ИИ-резюме появится после обработки записи.</FormHelperText>
        </Box>

        <Collapse in={!!submitError}>
          <Alert severity="error">{submitError}</Alert>
        </Collapse>
        <Collapse in={submitted && !isMeetingFormValid(errors) && !saving}>
          <Alert severity="warning">Исправьте ошибки в форме и повторите сохранение.</Alert>
        </Collapse>

        <Box>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
