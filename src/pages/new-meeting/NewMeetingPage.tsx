import { useNavigate } from "react-router-dom";
import { Paper, Typography } from "@mui/material";
import { CreateMeetingForm } from "@/features/create-meeting";

export default function NewMeetingPage() {
  const navigate = useNavigate();

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Новое собрание
      </Typography>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <CreateMeetingForm onCreated={(meeting) => navigate(`/meetings/${meeting.id}`)} />
      </Paper>
    </>
  );
}
