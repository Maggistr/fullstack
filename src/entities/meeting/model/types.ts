export interface Meeting {
  id: number;
  title: string;
  /** Дата в формате YYYY-MM-DD. */
  date: string;
  agenda: string[];
  summary: string;
  decisions: string[];
  /** Имя аудиофайла (backend пока хранит только имя, сам файл не загружается). */
  audioName: string | null;
}

/** Краткая запись из списка собраний. */
export interface MeetingListItem {
  id: number;
  title: string;
  date: string;
  audioName: string | null;
  agendaCount: number;
  decisionsCount: number;
}

export type NewMeeting = Pick<Meeting, "title" | "date" | "agenda" | "audioName">;

/** Изменяемые поля собрания. Списки заменяются целиком. */
export type MeetingPatch = Partial<Pick<Meeting, "title" | "date" | "summary" | "agenda" | "decisions">>;
