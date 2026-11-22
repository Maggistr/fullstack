import { MeetingCoreErrors, validateMeetingCore } from "@/entities/meeting";

export const MAX_AUDIO_SIZE_MB = 50;

export interface MeetingFormValues {
  title: string;
  date: string;
  /** Пункты повестки в порядке ввода (пустые строки допускаются, при сохранении отбрасываются). */
  agenda: string[];
  audio: File | null;
}

export type MeetingFormErrors = MeetingCoreErrors & { audio?: string };

export function validateMeetingForm(values: MeetingFormValues): MeetingFormErrors {
  const errors: MeetingFormErrors = validateMeetingCore(values);

  if (values.audio) {
    if (!values.audio.type.startsWith("audio/")) errors.audio = "Выберите аудиофайл (mp3, wav, m4a и т. п.)";
    else if (values.audio.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) errors.audio = `Файл больше ${MAX_AUDIO_SIZE_MB} МБ`;
  }
  return errors;
}

export function isMeetingFormValid(errors: MeetingFormErrors): boolean {
  return !errors.title && !errors.date && !errors.audio && !errors.agenda && Object.keys(errors.agendaItems).length === 0;
}
