import { Typography } from "@mui/material";
import { formatDate, todayIso } from "@/shared/lib/date";
import type { TaskStatus } from "../model/types";

interface DeadlineTextProps {
  deadline: string;
  status: TaskStatus;
}

/** Дедлайн; если срок прошёл, а задача не завершена, выделяется красным. */
export default function DeadlineText({ deadline, status }: DeadlineTextProps) {
  const overdue = status === "in_progress" && deadline < todayIso();
  return (
    <Typography
      component="span"
      variant="body2"
      color={overdue ? "error" : "text.secondary"}
      sx={{ fontWeight: overdue ? 600 : 400 }}
    >
      {formatDate(deadline)}
      {overdue && " · просрочено"}
    </Typography>
  );
}
