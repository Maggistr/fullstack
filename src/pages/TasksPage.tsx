import { Link as RouterLink } from "react-router-dom";
import { Chip, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { tasks } from "../data";

export default function TasksPage() {
  return (
    <>
      <Typography variant="h4" gutterBottom>Задачи и дедлайны</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Задача</TableCell>
              <TableCell>Ответственный</TableCell>
              <TableCell>Дедлайн</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Собрание</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.title}</TableCell>
                <TableCell>{t.assignee}</TableCell>
                <TableCell>{t.deadline}</TableCell>
                <TableCell>
                  <Chip size="small" color={t.done ? "success" : "warning"} label={t.done ? "Готово" : "В работе"} />
                </TableCell>
                <TableCell>
                  <Link component={RouterLink} to={`/meetings/${t.meetingId}`}>#{t.meetingId}</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
