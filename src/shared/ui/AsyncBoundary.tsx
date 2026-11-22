import { ReactNode } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import type { AsyncState } from "../lib/useAsync";

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  onRetry: () => void;
  /** Что показывать, пока данные грузятся (скелетоны). */
  skeleton: ReactNode;
  /** Если вернёт true, вместо содержимого показывается заглушка «нет данных». */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Единое отображение трёх состояний экрана с данными: загрузка, ошибка, нет данных. */
export default function AsyncBoundary<T>({
  state,
  onRetry,
  skeleton,
  isEmpty,
  emptyTitle = "Данных пока нет",
  emptyHint,
  emptyAction,
  children,
}: AsyncBoundaryProps<T>) {
  if (state.status === "loading") {
    return (
      <Box aria-busy="true" aria-live="polite">
        {skeleton}
      </Box>
    );
  }

  if (state.status === "error") {
    // Повтор имеет смысл при сбоях сети и сервера, но не при «нет доступа» / «не найдено» / «некорректный запрос»
    const canRetry = !(state.httpStatus !== undefined && state.httpStatus >= 400 && state.httpStatus < 500);
    return (
      <Alert
        severity="error"
        action={
          canRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Повторить
            </Button>
          ) : undefined
        }
      >
        {state.message}
      </Alert>
    );
  }

  if (isEmpty?.(state.data)) {
    return (
      <Stack alignItems="center" spacing={1} sx={{ py: 6, textAlign: "center" }}>
        <InboxOutlinedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
        <Typography variant="h6">{emptyTitle}</Typography>
        {emptyHint && <Typography color="text.secondary">{emptyHint}</Typography>}
        {emptyAction}
      </Stack>
    );
  }

  return <>{children(state.data)}</>;
}
