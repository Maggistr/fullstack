import { useRef, useState } from "react";
import { Box, Button, Collapse, FormHelperText, IconButton, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { TransitionGroup } from "react-transition-group";

interface StringListEditorProps {
  /** Подпись поля: «Пункт» → «Пункт 1», «Пункт 2»… */
  itemLabel: string;
  addLabel: string;
  initial: string[];
  /** Минимальное число строк (их нельзя удалить). */
  minRows?: number;
  /** Ошибки отдельных строк по индексу. */
  errors?: Record<number, string>;
  /** Общая ошибка списка. */
  error?: string;
  disabled?: boolean;
  onChange: (items: string[]) => void;
  onBlur?: () => void;
}

interface Row {
  key: number;
  text: string;
}

/** Редактируемый список строк (пункты повестки, решения): добавление и удаление с анимацией. */
export default function StringListEditor({
  itemLabel,
  addLabel,
  initial,
  minRows = 0,
  errors = {},
  error,
  disabled,
  onChange,
  onBlur,
}: StringListEditorProps) {
  const nextKey = useRef(0);
  const makeRow = (text: string): Row => ({ key: nextKey.current++, text });
  const [rows, setRows] = useState<Row[]>(() => {
    const start = initial.map(makeRow);
    while (start.length < minRows) start.push(makeRow(""));
    return start;
  });

  const commit = (next: Row[]) => {
    setRows(next);
    onChange(next.map((r) => r.text));
  };

  return (
    <Box>
      <TransitionGroup>
        {rows.map((row, index) => (
          <Collapse key={row.key}>
            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ pb: 1.5 }}>
              <TextField
                label={`${itemLabel} ${index + 1}`}
                value={row.text}
                onChange={(e) => commit(rows.map((r) => (r.key === row.key ? { ...r, text: e.target.value } : r)))}
                onBlur={onBlur}
                error={!!errors[index]}
                helperText={errors[index]}
                disabled={disabled}
                size="small"
                fullWidth
              />
              <IconButton
                aria-label={`Удалить: ${itemLabel.toLowerCase()} ${index + 1}`}
                onClick={() => commit(rows.filter((r) => r.key !== row.key))}
                disabled={disabled || rows.length <= minRows}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          </Collapse>
        ))}
      </TransitionGroup>
      {error && <FormHelperText error>{error}</FormHelperText>}
      <Button startIcon={<AddIcon />} onClick={() => commit([...rows, makeRow("")])} disabled={disabled} sx={{ mt: 0.5 }}>
        {addLabel}
      </Button>
    </Box>
  );
}
