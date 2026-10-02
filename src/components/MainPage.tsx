import React, { useState } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import {
  Sparkles,
  ArrowRight,
  Clock,
  FileText,
  Users,
  ShieldCheck,
  History,
  Zap,
  CheckCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { db, ensureAnonymousAuth } from '../lib/firebase';
import { RoomData, RoomTimer, UserProfile } from '../types';
import { getRecentRooms } from '../utils/user';

interface MainPageProps {
  onJoinRoom: (code: string) => void;
  userProfile: UserProfile;
}

export const MainPage: React.FC<MainPageProps> = ({ onJoinRoom, userProfile }) => {
  const [codeInput, setCodeInput] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const recentRooms = getRecentRooms();

  // 6자리 난수 코드 생성 함수
  const generateSixDigitCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // 1. 새 방 만들기 핸들러
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setErrorMessage('');

    try {
      await ensureAnonymousAuth();
      const code = generateSixDigitCode();
      const docRef = doc(db, 'rooms', code);

      const initialTimer: RoomTimer = {
        mode: 'pomodoro',
        duration: 25 * 60,
        remainingSeconds: 25 * 60,
        isRunning: false,
        startedAt: null,
        targetEndTime: null,
        lastUpdated: Date.now(),
        updatedBy: userProfile.nickname,
      };

      const newRoom: RoomData = {
        code,
        title: `워크스페이스 #${code}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: `# 🚀 ${code} 세션에 오신 것을 환영합니다!\n\n로그인 없이 6자리 코드로 접속한 실시간 협업 공간입니다.\n\n- 우측에서 25분 집중 / 5분 휴식 타이머를 시작해보세요.\n- 팀원이나 스터디원에게 6자리 코드 또는 링크를 전달하면 동시에 글을 쓸 수 있습니다.\n- 아래에 오늘 끝낼 작업이나 회의 안건을 자유롭게 기록해 보세요!\n\n## 📝 주요 안건\n1. `,
        lastUpdatedBy: userProfile.nickname,
        timer: initialTimer,
        todos: [
          { id: 't1', text: '6자리 코드로 팀원 초대하기', completed: false, createdAt: Date.now() },
          { id: 't2', text: '첫 25분 집중 스프린트 진행', completed: false, createdAt: Date.now() },
        ],
      };

      // Firestore에 문서 생성 및 초기화
      await setDoc(docRef, newRoom);

      // 해당 방으로 라우팅
      onJoinRoom(code);
    } catch (err: any) {
      console.error('Room creation error:', err);
      setErrorMessage('방 생성 중 오류가 발생했습니다: ' + (err.message || '네트워크를 확인해 주세요'));
    } finally {
      setIsCreating(false);
    }
  };

  // 2. 코드로 입장하기 핸들러
  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const sanitized = codeInput.trim().toUpperCase();
    if (!sanitized) {
      setErrorMessage('6자리 코드를 입력해 주세요.');
      return;
    }

    if (sanitized.length < 4 || sanitized.length > 8) {
      setErrorMessage('유효한 6자리 코드를 입력해 주세요.');
      return;
    }

    onJoinRoom(sanitized);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* 상단 네비게이션 */}
      <nav className="border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md sticky top-0 z-20 bg-white/70 dark:bg-slate-950/70 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                SyncSpace
              </span>
              <span className="text-xs text-slate-400 font-medium ml-2 hidden sm:inline">
                실시간 세션 워크스페이스
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 py-1.5 px-3 rounded-full">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: userProfile.color }}
            />
            <span>{userProfile.nickname}</span>
          </div>
        </div>
      </nav>

      {/* 히어로 및 핵심 액션 영역 */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16 flex-1 flex flex-col items-center justify-center text-center">
        {/* 태그 뱃지 */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>회원가입 없음 • 비밀번호 없음 • 즉시 동기화</span>
        </div>

        {/* 메인 타이틀 */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-4">
          6자리 코드로 시작하는
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            실시간 공유 메모장 & 타이머
          </span>
        </h1>

        <p className="max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
          새 방을 만들거나 6자리 세션 코드를 입력하면 끝!
          <br className="hidden sm:inline" />
          스터디원, 팀원과 함께 실시간으로 메모를 작성하고 포모도로 타이머를 맞춰보세요.
        </p>

        {/* 액션 카드 박스 */}
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. 새 방 만들기 */}
            <div className="flex flex-col justify-between p-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md text-left">
              <div>
                <span className="inline-block px-2.5 py-1 bg-white/20 rounded-md text-[11px] font-semibold tracking-wider uppercase mb-3">
                  새 세션
                </span>
                <h3 className="text-lg font-bold mb-1">새 방 만들기</h3>
                <p className="text-xs text-indigo-100 mb-6">
                  새 6자리 코드를 즉시 발급하고 전용 워크스페이스를 엽니다.
                </p>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full py-3 px-4 bg-white hover:bg-indigo-50 active:scale-98 text-indigo-700 font-bold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>방 생성 중...</span>
                  </>
                ) : (
                  <>
                    <span>새 방 만들기</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* 2. 코드로 입장하기 */}
            <div className="flex flex-col justify-between p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-left">
              <div>
                <span className="inline-block px-2.5 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[11px] font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-300 mb-3">
                  참여하기
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">코드로 입장하기</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  공유받은 6자리 세션 코드를 입력하고 바로 합류하세요.
                </p>
              </div>

              <form onSubmit={handleJoinWithCode} className="space-y-3">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                  placeholder="예: 491823"
                  maxLength={6}
                  className="w-full py-2.5 px-3 text-center font-mono text-lg font-bold tracking-widest bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase"
                />

                <button
                  type="submit"
                  disabled={!codeInput.trim()}
                  className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <span>입장하기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* 에러 메시지 알림 */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        {/* 최근 방문한 방 (로컬 기록) */}
        {recentRooms.length > 0 && (
          <div className="w-full max-w-xl mb-12 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              <History className="w-3.5 h-3.5" />
              <span>최근 방문한 방</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentRooms.map((room) => (
                <button
                  key={room.code}
                  onClick={() => onJoinRoom(room.code)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition group cursor-pointer shadow-2xs"
                >
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    #{room.code}
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                    {room.title || '워크스페이스'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 기능 설명 3단 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full text-left">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              실시간 공유 메모장
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Firestore `onSnapshot` 기반으로 작성하는 즉시 같은 방의 모든 참가자에게 글자가 실시간 동기화됩니다.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              동기화 포모도로 타이머
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              25분 집중, 5분 휴식, 스톱워치 등 방 참가자 모두가 하나의 타이머 시간을 오차 없이 함께 공유합니다.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              간편한 6자리 코드
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              복잡한 회원가입이나 앱 설치 없이 6자리 코드 또는 초대 링크만으로 어떤 기기에서든 바로 열립니다.
            </p>
          </div>
        </div>
      </main>

      {/* 하단 푸터 */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/70 py-6 text-center text-xs text-slate-400">
        <p>SyncSpace — Powered by React, Tailwind CSS &amp; Firebase Firestore</p>
      </footer>
    </div>
  );
};
