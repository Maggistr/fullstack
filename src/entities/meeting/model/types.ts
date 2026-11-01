export interface Meeting {
  id: number;
  title: string;
  /** Дата в формате YYYY-MM-DD. */
  date: string;
  agenda: string[];
  summary: string;
  decisions: string[];
  audioName: string | null;
}

export type NewMeeting = Pick<Meeting, "title" | "date" | "agenda" | "audioName">;
