import { Link as RouterLink } from "react-router-dom";
import { Button, Card, CardActions, CardContent, Stack, Typography } from "@mui/material";
import { meetings } from "../data";

export default function MeetingsPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Список собраний</Typography>
      {meetings.map((m) => (
        <Card key={m.id}>
          <CardContent>
            <Typography variant="h6">{m.title}</Typography>
            <Typography color="text.secondary">{m.date}</Typography>
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to={`/meetings/${m.id}`}>Открыть протокол</Button>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
