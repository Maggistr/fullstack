import { InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { TASK_STATUSES, TASK_STATUS_LABEL } from "@/entities/task";
import type { TaskFilterValue } from "../model/filter";

interface TaskFiltersProps {
  value: TaskFilterValue;
  onChange: (value: TaskFilterValue) => void;
}

export default function TaskFilters({ value, onChange }: TaskFiltersProps) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={value.status}
        onChange={(_, status) => status && onChange({ ...value, status })}
        aria-label="Фильтр по статусу"
        sx={{ flexWrap: "wrap" }}
      >
        <ToggleButton value="all">Все</ToggleButton>
        {TASK_STATUSES.map((s) => (
          <ToggleButton key={s} value={s}>
            {TASK_STATUS_LABEL[s]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <TextField
        size="small"
        placeholder="Поиск по задаче или ответственному"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ flexGrow: 1 }}
      />
    </Stack>
  );
}
