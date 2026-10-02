export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak' | 'stopwatch' | 'custom';

export interface RoomTimer {
  mode: TimerMode;
  duration: number; // 총 설정 초 (예: 1500)
  remainingSeconds: number; // 남은 시간 (초)
  isRunning: boolean;
  startedAt: number | null; // Date.now() timestamp
  targetEndTime: number | null; // startedAt + remainingSeconds * 1000
  lastUpdated: number;
  updatedBy: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface RoomData {
  code: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  content: string; // 메모장 텍스트
  lastUpdatedBy: string;
  timer: RoomTimer;
  todos: TodoItem[];
}

export interface UserProfile {
  id: string;
  nickname: string;
  color: string;
}
