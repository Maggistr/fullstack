import { apiRequest } from "@/shared/api/http";
import type { Meeting, MeetingListItem, NewMeeting } from "../model/types";

interface MeetingOutDto {
  id: number;
  title: string;
  date: string;
  summary: string;
  audio_path: string | null;
  agenda: string[];
  decisions: string[];
}

interface MeetingShortDto {
  id: number;
  title: string;
  date: string;
  audio_path: string | null;
  agenda_count: number;
  decisions_count: number;
}

const toMeeting = (dto: MeetingOutDto): Meeting => ({
  id: dto.id,
  title: dto.title,
  date: dto.date,
  summary: dto.summary,
  agenda: dto.agenda,
  decisions: dto.decisions,
  audioName: dto.audio_path,
});

export const listMeetings = async (): Promise<MeetingListItem[]> => {
  const items = await apiRequest<MeetingShortDto[]>("/meetings");
  return items.map((m) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    audioName: m.audio_path,
    agendaCount: m.agenda_count,
    decisionsCount: m.decisions_count,
  }));
};

export const getMeeting = async (id: number): Promise<Meeting> =>
  toMeeting(await apiRequest<MeetingOutDto>(`/meetings/${id}`));

export const createMeeting = async (input: NewMeeting): Promise<Meeting> =>
  toMeeting(
    await apiRequest<MeetingOutDto>("/meetings", {
      method: "POST",
      json: { title: input.title, date: input.date, agenda: input.agenda, audio_path: input.audioName },
    }),
  );
