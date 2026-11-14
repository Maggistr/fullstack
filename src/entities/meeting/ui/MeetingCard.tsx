import { Link as RouterLink } from "react-router-dom";
import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import MicNoneIcon from "@mui/icons-material/MicNone";
import { formatDate } from "@/shared/lib/date";
import { plural } from "@/shared/lib/plural";
import type { MeetingListItem } from "../model/types";

interface MeetingCardProps {
  meeting: MeetingListItem;
}

export default function MeetingCard({ meeting }: MeetingCardProps) {
  return (
    <Card
      sx={{
        transition: "box-shadow .2s, transform .2s",
        "&:hover": { boxShadow: 6, transform: "translateY(-2px)" },
      }}
    >
      <CardActionArea component={RouterLink} to={`/meetings/${meeting.id}`}>
        <CardContent>
          <Typography variant="h6">{meeting.title}</Typography>
          <Typography color="text.secondary" gutterBottom>
            {formatDate(meeting.date)}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label={plural(meeting.agendaCount, ["пункт", "пункта", "пунктов"])} />
            <Chip
              size="small"
              variant="outlined"
              label={plural(meeting.decisionsCount, ["решение", "решения", "решений"])}
            />
            {meeting.audioName && (
              <Chip size="small" variant="outlined" icon={<MicNoneIcon />} label="Есть аудиозапись" />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
