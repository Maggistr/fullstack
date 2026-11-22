import { useState } from "react";
import { Button } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Meeting, deleteMeeting } from "@/entities/meeting";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";

interface DeleteMeetingButtonProps {
  meeting: Pick<Meeting, "id" | "title">;
  onDeleted: () => void;
}

export default function DeleteMeetingButton({ meeting, onDeleted }: DeleteMeetingButtonProps) {
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
      await deleteMeeting(meeting.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить собрание");
      setPending(false);
    }
  };

  return (
    <>
      <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setOpen(true)}>
        Удалить
      </Button>
      <ConfirmDialog
        open={open}
        title="Удалить собрание?"
        text={`Собрание «${meeting.title}» будет удалено вместе с повесткой, решениями и задачами. Это действие нельзя отменить.`}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={close}
      />
    </>
  );
}
