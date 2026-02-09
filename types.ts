
export enum Day {
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  weeklyFrequency: number;
}

export interface Faculty {
  id: string;
  name: string;
  status: 'Present' | 'Absent';
}

export interface Section {
  id: string;
  name: string;
  semesterId: string;
}

export interface Semester {
  id: string;
  name: string;
  lunchEnabled?: boolean;
  lunchSlotIndex?: number;
}

export interface Assignment {
  id: string;
  sectionId: string;
  subjectId: string;
  facultyId: string;
}

export type EntryType = 'lecture' | 'lunch' | 'workshop' | 'event' | 'substitution';

export interface TimetableEntry {
  id: string;
  sectionId: string;
  day: Day;
  slotIndex: number;
  facultyId?: string;
  originalFacultyId?: string;
  subjectId?: string;
  isLocked: boolean;
  entryType?: EntryType;
  title?: string;
}

export interface DailyAvailability {
  facultyId: string;
  date: string;
  status: 'Present' | 'Absent';
  unavailableSlots: number[];
}

export interface AppState {
  semesters: Semester[];
  sections: Section[];
  faculty: Faculty[];
  subjects: Subject[];
  assignments: Assignment[];
  masterTimetable: TimetableEntry[];
  dailyAdjustments: Record<string, TimetableEntry[]>;
  facultyAvailability: Record<string, DailyAvailability[]>;
  config: {
    totalSlots: number;
  };
}
