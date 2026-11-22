import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, Fade, Link, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import { MeetingListItem, listMeetings } from "@/entities/meeting";
import { DeadlineText, Task, TaskStatusChip, listTasks } from "@/entities/task";
import { AddTaskForm } from "@/features/add-task";
import { DeleteTaskButton } from "@/features/delete-task";
import { EditTaskButton } from "@/features/edit-task";
import { TaskStatusSelect } from "@/features/change-task-status";
import { DEFAULT_TASK_FILTER, TaskFilters, TaskFilterValue, applyTaskFilter, isFilterActive } from "@/features/filter-tasks";
import AsyncBoundary from "@/shared/ui/AsyncBoundary";
import { useAsync } from "@/shared/lib/useAsync";

interface TasksData {
  tasks: Task[];
  meetings: MeetingListItem[];
}

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskFilterValue>(DEFAULT_TASK_FILTER);

  const { state, reload, update } = useAsync<TasksData>(async () => {
    const [tasks, meetings] = await Promise.all([listTasks(), listMeetings()]);
    return { tasks, meetings };
  }, []);

  const filtered = useMemo(
    () => (state.status === "success" ? applyTaskFilter(state.data.tasks, filter) : []),
    [state, filter],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        Задачи и дедлайны
      </Typography>

      <AsyncBoundary
        state={state}
        onRetry={reload}
        skeleton={
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={40} />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={52} />
            ))}
          </Stack>
        }
        isEmpty={(d) => d.tasks.length === 0}
        emptyTitle="Задач пока нет"
        emptyHint={
          "Задачи создаются по итогам собраний. Сначала добавьте собрание."
        }
        emptyAction={
          <Button variant="contained" component={RouterLink} to="/new" sx={{ mt: 1 }}>
            Новое собрание
          </Button>
        }
      >
        {({ meetings }) => {
          const titleOf = (id: number) => meetings.find((m) => m.id === id)?.title ?? `#${id}`;
          return (
            <Stack spacing={2}>
              <AddTaskForm
                meetingOptions={meetings}
                onAdded={(task) => update((d) => ({ ...d, tasks: [...d.tasks, task] }))}
              />
              <TaskFilters value={filter} onChange={setFilter} />

              {filtered.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 5 }}>
                  <Typography color="text.secondary">По выбранным условиям задач не найдено.</Typography>
                  {isFilterActive(filter) && (
                    <Button onClick={() => setFilter(DEFAULT_TASK_FILTER)}>Сбросить фильтры</Button>
                  )}
                </Stack>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Задача</TableCell>
                        <TableCell>Ответственный</TableCell>
                        <TableCell>Дедлайн</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Собрание</TableCell>
                        <TableCell align="right">Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TransitionGroup component={TableBody}>
                      {filtered.map((t) => (
                        <Fade key={t.id}>
                          <TableRow hover>
                            <TableCell>{t.title}</TableCell>
                            <TableCell>{t.assignee}</TableCell>
                            <TableCell>
                              <DeadlineText deadline={t.deadline} status={t.status} />
                            </TableCell>
                            <TableCell>
                              <Stack spacing={1} alignItems="flex-start">
                                <TaskStatusChip status={t.status} />
                                <TaskStatusSelect
                                  task={t}
                                  onChanged={(updated) =>
                                    update((d) => ({
                                      ...d,
                                      tasks: d.tasks.map((x) => (x.id === updated.id ? updated : x)),
                                    }))
                                  }
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Link component={RouterLink} to={`/meetings/${t.meetingId}`}>
                                {titleOf(t.meetingId)}
                              </Link>
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                              <EditTaskButton
                                task={t}
                                onSaved={(updated) =>
                                  update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === updated.id ? updated : x)) }))
                                }
                              />
                              <DeleteTaskButton
                                task={t}
                                onDeleted={(removed) =>
                                  update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== removed.id) }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        </Fade>
                      ))}
                    </TransitionGroup>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          );
        }}
      </AsyncBoundary>
    </Stack>
  );
}
