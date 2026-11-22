import { isValidIsoDate } from "@/shared/lib/date";

export interface MeetingCoreValues {
  title: string;
  date: string;
  /** Пункты повестки (пустые строки допускаются, при сохранении отбрасываются). */
  agenda: string[];
}

export interface MeetingCoreErrors {
  title?: string;
  date?: string;
  /** Общая ошибка списка повестки. */
  agenda?: string;
  /** Ошибки отдельных пунктов по индексу. */
  agendaItems: Record<number, string>;
}

export const MAX_ITEM_LENGTH = 500;

/** Ошибки отдельных строк списка (слишком длинные). */
export function validateItems(items: string[], label: string): Record<number, string> {
  const errors: Record<number, string> = {};
  items.forEach((item, index) => {
    if (item.trim().length > MAX_ITEM_LENGTH) errors[index] = `${label} не длиннее ${MAX_ITEM_LENGTH} символов`;
  });
  return errors;
}

/** Правила для названия, даты и повестки: общие для создания и редактирования собрания. */
export function validateMeetingCore(values: MeetingCoreValues): MeetingCoreErrors {
  const errors: MeetingCoreErrors = { agendaItems: validateItems(values.agenda, "Пункт") };

  const title = values.title.trim();
  if (!title) errors.title = "Введите название собрания";
  else if (title.length < 3) errors.title = "Название должно содержать минимум 3 символа";
  else if (title.length > 200) errors.title = "Название не длиннее 200 символов";

  if (!values.date) errors.date = "Укажите дату собрания";
  else if (!isValidIsoDate(values.date)) errors.date = "Некорректная дата";

  if (!values.agenda.some((item) => item.trim())) errors.agenda = "Добавьте хотя бы один пункт повестки";
  return errors;
}
