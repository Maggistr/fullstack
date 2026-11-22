import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Task, deleteTask } from "@/entities/task";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";

interface DeleteTaskButtonProps {
  task: Task;
  onDeleted: (task: Task) => void;
}

export default function DeleteTaskButton({ task, onDeleted }: DeleteTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await deleteTask(task.id);
      onDeleted(task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить задачу");
      setPending(false);
    }
  };

  return (
    <>
      <Tooltip title="Удалить задачу">
        <IconButton size="small" aria-label={`Удалить задачу «${task.title}»`} onClick={() => setOpen(true)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={open}
        title="Удалить задачу?"
        text={`Задача «${task.title}» будет удалена. Это действие нельзя отменить.`}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={close}
      />
    </>
  );
}
