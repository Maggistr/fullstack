import { Link as RouterLink } from "react-router-dom";
import { Button, Grow, Skeleton, Stack, Typography } from "@mui/material";
import { MeetingCard, listMeetings } from "@/entities/meeting";
import AsyncBoundary from "@/shared/ui/AsyncBoundary";
import { useAsync } from "@/shared/lib/useAsync";

export default function MeetingsPage() {
  const { state, reload } = useAsync(listMeetings, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        Список собраний
      </Typography>
      <AsyncBoundary
        state={state}
        onRetry={reload}
        skeleton={
          <Stack spacing={2}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={110} />
            ))}
          </Stack>
        }
        isEmpty={(meetings) => meetings.length === 0}
        emptyTitle="Собраний пока нет"
        emptyHint="Создайте первое собрание и подготовьте повестку."
        emptyAction={
          <Button variant="contained" component={RouterLink} to="/new" sx={{ mt: 1 }}>
            Новое собрание
          </Button>
        }
      >
        {(meetings) => (
          <Stack spacing={2}>
            {meetings.map((m, i) => (
              <Grow key={m.id} in appear timeout={300 + i * 120}>
                <div>
                  <MeetingCard meeting={m} />
                </div>
              </Grow>
            ))}
          </Stack>
        )}
      </AsyncBoundary>
    </Stack>
  );
}
