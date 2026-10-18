import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Stack, TextField, Typography } from "@mui/material";

export default function NewMeetingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [agenda, setAgenda] = useState("");

  const handleSave = () => navigate("/");

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Новое собрание</Typography>
      <TextField label="Название" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
      <TextField
        label="Дата"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />
      <TextField
        label="Повестка (по одному пункту в строке)"
        value={agenda}
        onChange={(e) => setAgenda(e.target.value)}
        multiline
        minRows={4}
        fullWidth
      />
      <Button variant="outlined" component="label">
        Загрузить аудиозапись
        <input type="file" accept="audio/*" hidden />
      </Button>
      <Button variant="contained" onClick={handleSave}>Сохранить</Button>
    </Stack>
  );
}
