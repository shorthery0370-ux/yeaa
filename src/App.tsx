import { useState, useEffect } from 'react';
import { MainPage } from './components/MainPage';
import { RoomPage } from './components/RoomPage';
import { UserProfile } from './types';
import { getOrCreateUserProfile } from './utils/user';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getOrCreateUserProfile());
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  // URL에서 초기 룸 코드 파싱 (/room/123456, ?room=123456, #123456 지원)
  useEffect(() => {
    const parseRoomCodeFromUrl = () => {
      // 1. Path 체크 (/room/XXXXXX)
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === 'room' && pathParts[1]) {
        return pathParts[1].toUpperCase();
      }

      // 2. Query param 체크 (?room=XXXXXX)
      const searchParams = new URLSearchParams(window.location.search);
      const queryRoom = searchParams.get('room');
      if (queryRoom) {
        return queryRoom.toUpperCase();
      }

      // 3. Hash 체크 (#XXXXXX)
      if (window.location.hash) {
        const hashVal = window.location.hash.replace('#', '').trim();
        if (hashVal.length >= 4) {
          return hashVal.toUpperCase();
        }
      }

      return null;
    };

    const initialCode = parseRoomCodeFromUrl();
    if (initialCode) {
      setActiveRoomCode(initialCode);
    }

    // 브라우저 뒤로가기 / 앞으로가기 지원
    const handlePopState = () => {
      const code = parseRoomCodeFromUrl();
      setActiveRoomCode(code);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 방 입장 처리
  const handleJoinRoom = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setActiveRoomCode(cleanCode);
    // URL 변경 (새로고침 없이 브라우저 주소창 업데이트)
    try {
      window.history.pushState({ room: cleanCode }, '', `/room/${cleanCode}`);
    } catch {
      // fallback
    }
  };

  // 방 나가기 처리
  const handleLeaveRoom = () => {
    setActiveRoomCode(null);
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {activeRoomCode ? (
        <RoomPage
          key={activeRoomCode}
          roomCode={activeRoomCode}
          userProfile={userProfile}
          onUpdateUserProfile={setUserProfile}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <MainPage
          onJoinRoom={handleJoinRoom}
          userProfile={userProfile}
        />
      )}
    </div>
  );
}
