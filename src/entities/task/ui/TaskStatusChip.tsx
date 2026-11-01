import { Chip } from "@mui/material";
import { TASK_STATUS_COLOR, TASK_STATUS_LABEL, TaskStatus } from "../model/types";

interface TaskStatusChipProps {
  status: TaskStatus;
}

export default function TaskStatusChip({ status }: TaskStatusChipProps) {
  return (
    <Chip
      size="small"
      color={TASK_STATUS_COLOR[status]}
      label={TASK_STATUS_LABEL[status]}
      sx={{ transition: "background-color .3s, color .3s" }}
    />
  );
}
