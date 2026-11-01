import { ApiError, simulateRequest } from "@/shared/api/fakeServer";
import { initialMeetings } from "../model/demoData";
import type { Meeting, NewMeeting } from "../model/types";

const meetings: Meeting[] = [...initialMeetings];
let nextId = Math.max(0, ...meetings.map((m) => m.id)) + 1;

export const listMeetings = (): Promise<Meeting[]> =>
  simulateRequest(() => [...meetings].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));

export const getMeeting = (id: number): Promise<Meeting> =>
  simulateRequest(() => {
    const meeting = meetings.find((m) => m.id === id);
    if (!meeting) throw new ApiError(`Собрание с id=${id} не найдено`, 404);
    return meeting;
  });

export const createMeeting = (input: NewMeeting): Promise<Meeting> =>
  simulateRequest(() => {
    const meeting: Meeting = { ...input, id: nextId++, summary: "", decisions: [] };
    meetings.push(meeting);
    return meeting;
  });
