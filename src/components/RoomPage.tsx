import React, { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import {
  Copy,
  Check,
  Share2,
  ArrowLeft,
  Users,
  AlertCircle,
  Loader2,
  Edit2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { db, ensureAnonymousAuth } from '../lib/firebase';
import { RoomData, RoomTimer, TodoItem, UserProfile } from '../types';
import { TimerComponent } from './TimerComponent';
import { NotepadComponent } from './NotepadComponent';
import { TodoListComponent } from './TodoListComponent';
import { addRecentRoom, saveUserProfile } from '../utils/user';

interface RoomPageProps {
  roomCode: string;
  userProfile: UserProfile;
  onUpdateUserProfile: (newProfile: UserProfile) => void;
  onLeaveRoom: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({
  roomCode,
  userProfile,
  onUpdateUserProfile,
  onLeaveRoom,
}) => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const [tempNickname, setTempNickname] = useState<string>(userProfile.nickname);

  // Firestore 문서 참조
  const roomDocRef = doc(db, 'rooms', roomCode);

  // Firestore onSnapshot 실시간 리스너 및 라이프사이클(unsubscribe) 관리
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // 1. 익명 인증 처리 (필요시)
    ensureAnonymousAuth();

    // 2. onSnapshot 리스너 등록
    const unsubscribe = onSnapshot(
      roomDocRef,
      (docSnap) => {
        if (!isMounted) return;

        if (docSnap.exists()) {
          const data = docSnap.data() as RoomData;
          setRoomData(data);
          setTempTitle(data.title || `세션 #${roomCode}`);
          addRecentRoom(roomCode, data.title);
          setIsLoading(false);
        } else {
          // 문서가 없는 경우: 새 방 생성 제안 가능
          setRoomData(null);
          setIsLoading(false);
        }
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firestore onSnapshot error:', err);
        setError('방 정보를 불러오는 중 오류가 발생했습니다: ' + err.message);
        setIsLoading(false);
      }
    );

    // 3. 언마운트 시 클린업 (중요 요구사항: onSnapshot 구독 정상 해제)
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomCode]);

  // 방 자동 생성 (없는 방 코드로 들어왔을 때 초기화)
  const handleCreateMissingRoom = async () => {
    setIsLoading(true);
    try {
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

      const initialRoom: RoomData = {
        code: roomCode,
        title: `방 #${roomCode}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: `# 🚀 ${roomCode} 세션에 오신 것을 환영합니다!\n\n이곳은 로그인 없이 실시간으로 공유되는 메모장입니다.\n- 우측 타이머로 포모도로 집중을 시작해보세요.\n- 작성하는 모든 내용은 참가자들에게 즉시 동기화됩니다.`,
        lastUpdatedBy: userProfile.nickname,
        timer: initialTimer,
        todos: [
          { id: 'todo_1', text: '방 링크 공유하기', completed: false, createdAt: Date.now() },
          { id: 'todo_2', text: '집중 타이머 시작하기', completed: false, createdAt: Date.now() },
        ],
      };

      await setDoc(roomDocRef, initialRoom);
      setRoomData(initialRoom);
    } catch (e: any) {
      console.error(e);
      setError('방 생성 실패: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 메모장 내용 실시간 업데이트
  const handleUpdateNotepad = async (newContent: string) => {
    try {
      await updateDoc(roomDocRef, {
        content: newContent,
        lastUpdatedBy: userProfile.nickname,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update notepad:', err);
    }
  };

  // 타이머 상태 실시간 업데이트
  const handleUpdateTimer = async (updatedTimer: RoomTimer) => {
    try {
      await updateDoc(roomDocRef, {
        timer: updatedTimer,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update timer:', err);
    }
  };

  // 투두리스트 실시간 업데이트
  const handleUpdateTodos = async (todos: TodoItem[]) => {
    try {
      await updateDoc(roomDocRef, {
        todos,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update todos:', err);
    }
  };

  // 방 제목 변경
  const handleSaveTitle = async () => {
    if (!tempTitle.trim()) return;
    setIsEditingTitle(false);
    try {
      await updateDoc(roomDocRef, {
        title: tempTitle.trim(),
        updatedAt: Date.now(),
      });
      addRecentRoom(roomCode, tempTitle.trim());
    } catch (err) {
      console.error(err);
    }
  };

  // 닉네임 변경
  const handleSaveNickname = () => {
    if (!tempNickname.trim()) return;
    const updated = { ...userProfile, nickname: tempNickname.trim() };
    onUpdateUserProfile(updated);
    saveUserProfile(updated);
    setIsEditingNickname(false);
  };

  // 6자리 세션 코드 복사
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  // 방 전체 초대 URL 복사
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          세션 <span className="font-mono font-bold text-indigo-600">{roomCode}</span> 연결 중...
        </p>
      </div>
    );
  }

  // 오류 화면
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 max-w-md w-full shadow-lg text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">연결 오류</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
            >
              메인으로 이동
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 방이 존재하지 않는 경우
  if (!roomData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-xl text-center">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            방을 찾을 수 없습니다
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            코드 <span className="font-mono font-bold text-indigo-600">{roomCode}</span>의 방이 아직 생성되지 않았습니다. 지금 바로 이 코드로 새 방을 만드시겠습니까?
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleCreateMissingRoom}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              이 코드로 새 방 만들기
            </button>
            <button
              onClick={onLeaveRoom}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition"
            >
              메인 화면으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 최상단 네비게이션 & 세션 제어 헤더 */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* 좌측: 뒤로가기 & 방 제목 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onLeaveRoom}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title="메인으로 나가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* 방 제목 (인라인 편집 가능) */}
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="text-base font-bold px-2 py-0.5 border border-indigo-400 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {roomData.title || `세션 #${roomCode}`}
                  </h1>
                  <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                </div>
              )}
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>실시간 동기화 활성</span>
                <span>•</span>
                <span>비밀번호/로그인 없음</span>
              </div>
            </div>
          </div>

          {/* 중앙/우측: 6자리 코드 뱃지 및 액션 */}
          <div className="flex items-center flex-wrap gap-2">
            {/* 6자리 코드 복사 칩 */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 pl-3 gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">코드</span>
              <span className="font-mono text-base font-black tracking-widest text-indigo-600 dark:text-indigo-400">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-2xs transition font-medium"
                title="6자리 코드 복사"
              >
                {isCopiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>코드 복사</span>
                  </>
                )}
              </button>
            </div>

            {/* 초대 링크 복사 버튼 */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
              title="접속 링크 복사"
            >
              {isCopiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>링크 복사완료!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>초대 링크</span>
                </>
              )}
            </button>

            {/* 내 닉네임 설정 */}
            {isEditingNickname ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                  maxLength={12}
                  className="w-24 text-xs px-2 py-1.5 border border-indigo-400 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  autoFocus
                />
                <button
                  onClick={handleSaveNickname}
                  className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingNickname(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition"
                title="닉네임 변경하기"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: userProfile.color }}
                />
                <span className="truncate max-w-[100px]">{userProfile.nickname}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 메인 작업 영역: 2단 레이아웃 (메모장 & 타이머/투두) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측 7~8컬럼: 실시간 공유 메모장 */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col h-[calc(100vh-140px)] min-h-[580px]">
          <NotepadComponent
            content={roomData.content}
            lastUpdatedBy={roomData.lastUpdatedBy}
            lastUpdated={roomData.updatedAt}
            userName={userProfile.nickname}
            onUpdateContent={handleUpdateNotepad}
          />
        </section>

        {/* 우측 4~5컬럼: 실시간 동기화 타이머 & 공유 투두리스트 */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <TimerComponent
            timer={roomData.timer}
            onUpdateTimer={handleUpdateTimer}
            userName={userProfile.nickname}
          />

          <TodoListComponent
            todos={roomData.todos || []}
            onUpdateTodos={handleUpdateTodos}
          />
        </section>
      </main>
    </div>
  );
};
