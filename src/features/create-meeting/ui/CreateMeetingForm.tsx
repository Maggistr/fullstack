import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Collapse, FormHelperText, Stack, TextField, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Meeting, createMeeting } from "@/entities/meeting";
import { todayIso } from "@/shared/lib/date";
import StringListEditor from "@/shared/ui/StringListEditor";
import { isMeetingFormValid, MeetingFormValues, validateMeetingForm } from "../model/validation";

interface CreateMeetingFormProps {
  onCreated: (meeting: Meeting) => void;
}

export default function CreateMeetingForm({ onCreated }: CreateMeetingFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [agenda, setAgenda] = useState<string[]>([""]);
  const [audio, setAudio] = useState<File | null>(null);

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values: MeetingFormValues = { title, date, agenda, audio };
  const errors = useMemo(() => validateMeetingForm(values), [title, date, agenda, audio]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));
  const shown = (field: string) => submitted || touched.has(field);

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
        agenda: agenda.map((x) => x.trim()).filter(Boolean),
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
          <StringListEditor
            itemLabel="Пункт"
            addLabel="Добавить пункт"
            initial={[""]}
            minRows={1}
            onChange={setAgenda}
            onBlur={() => touch("agenda")}
            errors={shown("agenda") ? errors.agendaItems : undefined}
            error={shown("agenda") ? errors.agenda : undefined}
            disabled={saving}
          />
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
