import { UserProfile } from '../types';

const ADJECTIVES = ['집중하는', '열정적인', '기민한', '빛나는', '차분한', '지혜로운', '즐거운', '꼼꼼한', '창의적인', '다정한'];
const ANIMALS = ['부엉이', '판다', '여우', '사자', '돌고래', '호랑이', '수달', '독수리', '토끼', '고양이'];
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];

export function getOrCreateUserProfile(): UserProfile {
  const cached = localStorage.getItem('syncspace_user_profile');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const id = 'user_' + Math.random().toString(36).substring(2, 9);

  const profile: UserProfile = {
    id,
    nickname: `${randomAdj} ${randomAnimal}`,
    color: randomColor,
  };

  localStorage.setItem('syncspace_user_profile', JSON.stringify(profile));
  return profile;
}

export function saveUserProfile(profile: UserProfile) {
  localStorage.setItem('syncspace_user_profile', JSON.stringify(profile));
}

export function addRecentRoom(code: string, title?: string) {
  try {
    const raw = localStorage.getItem('syncspace_recent_rooms');
    const list: Array<{ code: string; title: string; visitedAt: number }> = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((r) => r.code !== code);
    filtered.unshift({
      code,
      title: title || `방 #${code}`,
      visitedAt: Date.now(),
    });
    localStorage.setItem('syncspace_recent_rooms', JSON.stringify(filtered.slice(0, 5)));
  } catch (e) {
    console.error(e);
  }
}

export function getRecentRooms(): Array<{ code: string; title: string; visitedAt: number }> {
  try {
    const raw = localStorage.getItem('syncspace_recent_rooms');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
