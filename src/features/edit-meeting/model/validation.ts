import { MeetingCoreErrors, MeetingCoreValues, validateItems, validateMeetingCore } from "@/entities/meeting";

export const MAX_SUMMARY_LENGTH = 5000;

export interface EditMeetingValues extends MeetingCoreValues {
  summary: string;
  decisions: string[];
}

export type EditMeetingErrors = MeetingCoreErrors & {
  summary?: string;
  decisionItems: Record<number, string>;
};

export function validateEditMeeting(values: EditMeetingValues): EditMeetingErrors {
  const errors: EditMeetingErrors = { ...validateMeetingCore(values), decisionItems: validateItems(values.decisions, "Решение") };
  if (values.summary.length > MAX_SUMMARY_LENGTH) errors.summary = `Резюме не длиннее ${MAX_SUMMARY_LENGTH} символов`;
  return errors;
}

export function isEditMeetingValid(errors: EditMeetingErrors): boolean {
  return (
    !errors.title &&
    !errors.date &&
    !errors.agenda &&
    !errors.summary &&
    Object.keys(errors.agendaItems).length === 0 &&
    Object.keys(errors.decisionItems).length === 0
  );
}
