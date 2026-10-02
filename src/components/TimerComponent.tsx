import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Bell, BellOff, Volume2, Maximize2, Minimize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RoomTimer, TimerMode } from '../types';
import { playTimerCompleteSound, playClickSound } from '../utils/sound';

interface TimerComponentProps {
  timer: RoomTimer;
  onUpdateTimer: (updatedTimer: RoomTimer) => Promise<void>;
  userName: string;
}

const PRESETS: { mode: TimerMode; label: string; icon: string; seconds: number }[] = [
  { mode: 'pomodoro', label: '25분 집중', icon: '🍅', seconds: 25 * 60 },
  { mode: 'shortBreak', label: '5분 휴식', icon: '☕', seconds: 5 * 60 },
  { mode: 'longBreak', label: '15분 긴 휴식', icon: '🌿', seconds: 15 * 60 },
  { mode: 'stopwatch', label: '스톱워치', icon: '⏱️', seconds: 0 },
];

export const TimerComponent: React.FC<TimerComponentProps> = ({ timer, onUpdateTimer, userName }) => {
  const [displaySeconds, setDisplaySeconds] = useState<number>(timer.remainingSeconds);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('30');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const timerContainerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredEndRef = useRef<boolean>(false);

  // 실시간 정확한 시간 계산 (각 클라이언트의 렌더 루프)
  useEffect(() => {
    const updateTime = () => {
      if (!timer.isRunning) {
        setDisplaySeconds(timer.remainingSeconds);
        hasTriggeredEndRef.current = false;
        return;
      }

      const now = Date.now();

      if (timer.mode === 'stopwatch') {
        const started = timer.startedAt || now;
        const elapsed = Math.floor((now - started) / 1000);
        setDisplaySeconds(Math.max(0, elapsed));
      } else {
        // 카운트다운 모드
        if (timer.targetEndTime) {
          const left = Math.ceil((timer.targetEndTime - now) / 1000);
          if (left <= 0) {
            setDisplaySeconds(0);
            if (!hasTriggeredEndRef.current) {
              hasTriggeredEndRef.current = true;
              if (soundEnabled) {
                playTimerCompleteSound();
              }
              // 폭죽 효과
              try {
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } catch {
                // ignore
              }
              // 방 타이머 상태 종료로 자동 업데이트
              onUpdateTimer({
                ...timer,
                isRunning: false,
                remainingSeconds: 0,
                targetEndTime: null,
                startedAt: null,
                lastUpdated: Date.now(),
                updatedBy: userName,
              });
            }
          } else {
            setDisplaySeconds(left);
          }
        } else {
          setDisplaySeconds(timer.remainingSeconds);
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 250);
    return () => clearInterval(interval);
  }, [timer, soundEnabled, onUpdateTimer, userName]);

  // 시작 / 재개 핸들러
  const handleStart = async () => {
    playClickSound();
    const now = Date.now();

    if (timer.mode === 'stopwatch') {
      const startedAt = now - displaySeconds * 1000;
      await onUpdateTimer({
        ...timer,
        isRunning: true,
        startedAt,
        targetEndTime: null,
        remainingSeconds: displaySeconds,
        lastUpdated: now,
        updatedBy: userName,
      });
    } else {
      const remaining = displaySeconds > 0 ? displaySeconds : timer.duration;
      const targetEndTime = now + remaining * 1000;
      await onUpdateTimer({
        ...timer,
        isRunning: true,
        startedAt: now,
        remainingSeconds: remaining,
        targetEndTime,
        lastUpdated: now,
        updatedBy: userName,
      });
    }
  };

  // 일시정지 핸들러
  const handlePause = async () => {
    playClickSound();
    const now = Date.now();
    let currentRemaining = displaySeconds;

    if (timer.mode === 'stopwatch') {
      const started = timer.startedAt || now;
      currentRemaining = Math.max(0, Math.floor((now - started) / 1000));
    } else if (timer.targetEndTime) {
      currentRemaining = Math.max(0, Math.ceil((timer.targetEndTime - now) / 1000));
    }

    await onUpdateTimer({
      ...timer,
      isRunning: false,
      startedAt: null,
      targetEndTime: null,
      remainingSeconds: currentRemaining,
      lastUpdated: now,
      updatedBy: userName,
    });
  };

  // 리셋 핸들러
  const handleReset = async () => {
    playClickSound();
    const now = Date.now();
    await onUpdateTimer({
      ...timer,
      isRunning: false,
      startedAt: null,
      targetEndTime: null,
      remainingSeconds: timer.mode === 'stopwatch' ? 0 : timer.duration,
      lastUpdated: now,
      updatedBy: userName,
    });
  };

  // 프리셋 모드 변경
  const handleSelectPreset = async (preset: typeof PRESETS[0]) => {
    playClickSound();
    const now = Date.now();
    await onUpdateTimer({
      mode: preset.mode,
      duration: preset.seconds,
      remainingSeconds: preset.seconds,
      isRunning: false,
      startedAt: null,
      targetEndTime: null,
      lastUpdated: now,
      updatedBy: userName,
    });
  };

  // 커스텀 분 설정
  const handleApplyCustomMinutes = async () => {
    const mins = parseInt(customMinutesInput, 10);
    if (isNaN(mins) || mins <= 0 || mins > 999) return;
    const secs = mins * 60;
    setShowCustomModal(false);
    playClickSound();
    const now = Date.now();
    await onUpdateTimer({
      mode: 'custom',
      duration: secs,
      remainingSeconds: secs,
      isRunning: false,
      startedAt: null,
      targetEndTime: null,
      lastUpdated: now,
      updatedBy: userName,
    });
  };

  // 시간 더하기/빼기 (±1분)
  const handleAdjustSeconds = async (deltaSeconds: number) => {
    if (timer.mode === 'stopwatch') return;
    const now = Date.now();
    const newRemaining = Math.max(10, displaySeconds + deltaSeconds);
    const newTarget = timer.isRunning ? now + newRemaining * 1000 : null;

    await onUpdateTimer({
      ...timer,
      remainingSeconds: newRemaining,
      duration: Math.max(newRemaining, timer.duration),
      targetEndTime: newTarget,
      lastUpdated: now,
      updatedBy: userName,
    });
  };

  // 전체 화면 토글
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      timerContainerRef.current?.requestFullscreen?.();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullScreen(false);
    }
  };

  // 초를 MM:SS 형식으로 변환
  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 진행률 (0 ~ 100%)
  const progressPercent =
    timer.mode === 'stopwatch'
      ? 100
      : timer.duration > 0
      ? Math.max(0, Math.min(100, ((timer.duration - displaySeconds) / timer.duration) * 100))
      : 0;

  return (
    <div
      ref={timerContainerRef}
      className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all ${
        isFullScreen ? 'h-screen w-screen flex items-center justify-center p-12' : ''
      }`}
    >
      {/* 상단 탭 / 헤더 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              실시간 동기화 타이머
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? '알림음 켜짐' : '알림음 음소거'}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {soundEnabled ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={toggleFullScreen}
              title="전체화면"
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 프리셋 버튼 그룹 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-6">
          {PRESETS.map((preset) => {
            const isActive = timer.mode === preset.mode;
            return (
              <button
                key={preset.mode}
                onClick={() => handleSelectPreset(preset)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 대형 타이머 디스플레이 */}
      <div className="my-auto flex flex-col items-center justify-center py-4">
        {/* 진행 게이지 바 */}
        {timer.mode !== 'stopwatch' && (
          <div className="w-full max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full transition-all duration-300 ${
                timer.mode === 'shortBreak' || timer.mode === 'longBreak'
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div className="relative flex items-center justify-center">
          <div
            className={`font-mono font-bold tracking-tight select-none transition-colors ${
              isFullScreen ? 'text-8xl sm:text-9xl' : 'text-6xl sm:text-7xl'
            } ${
              timer.isRunning
                ? timer.mode === 'pomodoro'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {formatTime(displaySeconds)}
          </div>
        </div>

        {/* 상태 라벨 */}
        <div className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              timer.isRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
            }`}
          />
          <span>
            {timer.isRunning ? '모두와 함께 실행 중' : '일시 정지됨'}
          </span>
          {timer.updatedBy && (
            <span className="text-slate-400 dark:text-slate-500">
              (최근 제어: {timer.updatedBy})
            </span>
          )}
        </div>

        {/* ±1분 미세 조정 버튼 (카운트다운 시에만) */}
        {timer.mode !== 'stopwatch' && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => handleAdjustSeconds(-60)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="1분 빼기"
            >
              <Minus className="w-3 h-3" /> 1분
            </button>
            <button
              onClick={() => handleAdjustSeconds(60)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="1분 추가"
            >
              <Plus className="w-3 h-3" /> 1분
            </button>
            <button
              onClick={() => setShowCustomModal(true)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              직접 입력
            </button>
          </div>
        )}
      </div>

      {/* 하단 메인 컨트롤 버튼 */}
      <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        {timer.isRunning ? (
          <button
            onClick={handlePause}
            className="flex-1 max-w-[160px] flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold shadow-sm transition"
          >
            <Pause className="w-5 h-5 fill-current" />
            <span>일시정지</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            className={`flex-1 max-w-[160px] flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-white font-semibold active:scale-95 shadow-sm transition ${
              timer.mode === 'pomodoro'
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>시작하기</span>
          </button>
        )}

        <button
          onClick={handleReset}
          title="타이머 리셋"
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* 직접 시간 입력 팝업 모달 */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              타이머 시간 직접 설정
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              집중할 시간(분 단위)을 입력하면 방 안의 모든 사용자에게 즉시 적용됩니다.
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input
                type="number"
                min="1"
                max="360"
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                className="w-full text-center text-2xl font-mono font-bold p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                placeholder="30"
                autoFocus
              />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">분</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                취소
              </button>
              <button
                onClick={handleApplyCustomMinutes}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
              >
                설정 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
