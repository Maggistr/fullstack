import { isValidIsoDate } from "@/shared/lib/date";
import type { FormErrors } from "@/shared/lib/validation";

export const MAX_AUDIO_SIZE_MB = 50;

export interface MeetingFormValues {
  title: string;
  date: string;
  /** Пункты повестки в порядке ввода (пустые строки допускаются, при сохранении отбрасываются). */
  agenda: string[];
  audio: File | null;
}

export type MeetingFormErrors = FormErrors<Pick<MeetingFormValues, "title" | "date" | "audio">> & {
  /** Общая ошибка списка повестки. */
  agenda?: string;
  /** Ошибки отдельных пунктов повестки по индексу. */
  agendaItems: Record<number, string>;
};

export function validateMeetingForm(values: MeetingFormValues): MeetingFormErrors {
  const errors: MeetingFormErrors = { agendaItems: {} };

  const title = values.title.trim();
  if (!title) errors.title = "Введите название собрания";
  else if (title.length < 3) errors.title = "Название должно содержать минимум 3 символа";
  else if (title.length > 200) errors.title = "Название не длиннее 200 символов";

  if (!values.date) errors.date = "Укажите дату собрания";
  else if (!isValidIsoDate(values.date)) errors.date = "Некорректная дата";

  values.agenda.forEach((item, index) => {
    if (item.trim().length > 500) errors.agendaItems[index] = "Пункт не длиннее 500 символов";
  });
  if (!values.agenda.some((item) => item.trim())) errors.agenda = "Добавьте хотя бы один пункт повестки";

  if (values.audio) {
    if (!values.audio.type.startsWith("audio/")) errors.audio = "Выберите аудиофайл (mp3, wav, m4a и т. п.)";
    else if (values.audio.size > MAX_AUDIO_SIZE_MB * 1024 * 1024)
      errors.audio = `Файл больше ${MAX_AUDIO_SIZE_MB} МБ`;
  }

  return errors;
}

export function isMeetingFormValid(errors: MeetingFormErrors): boolean {
  return !errors.title && !errors.date && !errors.audio && !errors.agenda && Object.keys(errors.agendaItems).length === 0;
}
