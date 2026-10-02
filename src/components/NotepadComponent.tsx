import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Eye,
  Edit3,
  Columns,
  Bold,
  Italic,
  Heading2,
  List,
  CheckSquare,
  Code,
  Quote,
  Clock,
  Sparkles,
  CloudCheck,
  RefreshCw
} from 'lucide-react';

interface NotepadComponentProps {
  content: string;
  lastUpdatedBy: string;
  lastUpdated: number;
  userName: string;
  onUpdateContent: (newContent: string) => Promise<void>;
}

export const NotepadComponent: React.FC<NotepadComponentProps> = ({
  content: remoteContent,
  lastUpdatedBy,
  lastUpdated,
  userName,
  onUpdateContent,
}) => {
  const [localContent, setLocalContent] = useState<string>(remoteContent || '');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<number>(lastUpdated || Date.now());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);
  const lastLocalEditTimeRef = useRef<number>(0);

  // 원격 데이터 동기화 (외부 변경 사항 반영)
  useEffect(() => {
    // 사용자가 방금 타자 치고 있는 중(최근 600ms 이내)이고 로컬 내용과 다르다면 덮어쓰지 않음
    const timeSinceLastEdit = Date.now() - lastLocalEditTimeRef.current;
    if (timeSinceLastEdit < 700 && isTypingRef.current) {
      return;
    }

    if (remoteContent !== undefined && remoteContent !== localContent) {
      setLocalContent(remoteContent);
      setLastSavedTime(lastUpdated);
    }
  }, [remoteContent, lastUpdated]);

  // Firestore 저장 디바운스
  const saveToFirestore = useCallback(
    async (text: string) => {
      setIsSaving(true);
      try {
        await onUpdateContent(text);
        setLastSavedTime(Date.now());
      } catch (err) {
        console.error('Failed to sync notepad to Firestore:', err);
      } finally {
        setIsSaving(false);
        isTypingRef.current = false;
      }
    },
    [onUpdateContent]
  );

  // 내용 변경 이벤트
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalContent(val);
    isTypingRef.current = true;
    lastLocalEditTimeRef.current = Date.now();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveToFirestore(val);
    }, 400);
  };

  // 포맷팅 마크다운 삽입 유틸리티
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end) || defaultText;

    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newVal = `${before}${replacement}${after}`;

    setLocalContent(newVal);
    isTypingRef.current = true;
    lastLocalEditTimeRef.current = Date.now();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveToFirestore(newVal);
    }, 400);
  };

  // 타임스탬프 삽입
  const insertTimestamp = () => {
    const nowStr = `[${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}] `;
    insertFormatting(nowStr, '', '');
  };

  // 템플릿 로드
  const loadTemplate = (type: 'meeting' | 'todo' | 'ideas') => {
    let tpl = '';
    const date = new Date().toLocaleDateString('ko-KR');

    if (type === 'meeting') {
      tpl = `# 📋 회의록 (${date})\n\n## 👥 참석자\n- ${userName}\n\n## 🎯 안건\n1. \n2. \n\n## 💡 논의 내용\n- \n\n## ✅ Action Items\n- [ ] 담당자: 해야 할 일\n`;
    } else if (type === 'todo') {
      tpl = `# 🎯 오늘 집중할 일 (${date})\n\n- [ ] 우선순위 1:\n- [ ] 우선순위 2:\n- [ ] 우선순위 3:\n\n## 📝 메모\n`;
    } else {
      tpl = `# 💡 아이디어 브레인스토밍\n\n- 주제: \n- 핵심 목표: \n\n## 💭 아이디어 목록\n1. \n2. \n3. \n\n## 🔍 다음 단계 검토\n`;
    }

    if (localContent.trim() && !window.confirm('기존 내용 뒤에 템플릿을 추가하시겠습니까? (취소 시 기존 내용이 대체됩니다)')) {
      const newVal = tpl;
      setLocalContent(newVal);
      saveToFirestore(newVal);
      return;
    }

    const newVal = localContent ? `${localContent}\n\n${tpl}` : tpl;
    setLocalContent(newVal);
    saveToFirestore(newVal);
  };

  // 전체 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = localContent;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 파일 다운로드
  const handleDownload = () => {
    const blob = new Blob([localContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SyncSpace_메모_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 내용 전체 지우기
  const handleClear = () => {
    if (window.confirm('공유 메모장의 모든 내용을 지우시겠습니까? 모든 참가자의 화면에서도 삭제됩니다.')) {
      setLocalContent('');
      saveToFirestore('');
    }
  };

  // 통계 계산
  const charCount = localContent.length;
  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
  const lineCount = localContent ? localContent.split('\n').length : 1;

  // 간단한 마크다운 렌더러 (순수 구현)
  const renderSimpleMarkdown = (md: string) => {
    if (!md.trim()) {
      return (
        <div className="text-slate-400 italic text-sm py-8 text-center">
          작성된 메모가 없습니다. 편집 모드에서 내용을 입력해 보세요!
        </div>
      );
    }

    const lines = md.split('\n');
    return (
      <div className="space-y-2 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-bold text-slate-900 dark:text-white pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                {line.substring(2)}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-slate-900 dark:text-white pt-2">
                {line.substring(3)}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-slate-900 dark:text-white pt-1">
                {line.substring(4)}
              </h3>
            );
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            const isDone = line.startsWith('- [x] ') || line.startsWith('- [X] ');
            return (
              <div key={idx} className="flex items-center gap-2 pl-2">
                <input type="checkbox" checked={isDone} readOnly className="rounded text-indigo-600 pointer-events-none" />
                <span className={isDone ? 'line-through text-slate-400' : ''}>{line.substring(6)}</span>
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc">
                {line.substring(2)}
              </li>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-4 border-indigo-400 dark:border-indigo-600 pl-3 py-1 italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-r">
                {line.substring(2)}
              </blockquote>
            );
          }
          if (line.startsWith('```')) {
            return (
              <div key={idx} className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                {line}
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
      {/* 툴바 상단 */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>실시간 공유 메모장</span>
          </div>

          {/* 동기화 상태 표시 */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            {isSaving ? (
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>저장 중...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>동기화됨</span>
              </span>
            )}
            {lastUpdatedBy && (
              <span className="hidden sm:inline text-slate-400">
                • 최근 수정: {lastUpdatedBy}
              </span>
            )}
          </div>
        </div>

        {/* 보기 모드 및 액션 버튼들 */}
        <div className="flex items-center gap-1.5">
          {/* 템플릿 선택 드롭다운 */}
          <div className="relative group">
            <button
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              title="회의록, 할 일 등의 서식 적용"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">서식 템플릿</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1 hidden group-hover:block z-20">
              <button
                onClick={() => loadTemplate('meeting')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                📋 회의록 양식
              </button>
              <button
                onClick={() => loadTemplate('todo')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                🎯 일일 할 일 목록
              </button>
              <button
                onClick={() => loadTemplate('ideas')}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                💡 아이디어 스케치
              </button>
            </div>
          </div>

          {/* 보기 모드 전환 */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="편집기 전용"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md text-xs hidden md:block transition ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="분할 보기 (편집 + 미리보기)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="미리보기"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 복사 버튼 */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 p-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition"
            title="클립보드로 전체 복사"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* 다운로드 버튼 */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition"
            title="마크다운(.md) 파일 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* 비우기 버튼 */}
          <button
            onClick={handleClear}
            className="p-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
            title="메모장 비우기"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 마크다운 포맷팅 퀵 버튼 (편집 모드 시) */}
      {viewMode !== 'preview' && (
        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center gap-1 overflow-x-auto text-xs text-slate-600 dark:text-slate-400">
          <button
            onClick={() => insertFormatting('**', '**', '굵은 텍스트')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="굵게"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*', '기울임 텍스트')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="기울임"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('## ', '', '제목')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="제목 (H2)"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- ', '', '목록 내용')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="글머리 기호 목록"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] ', '', '할 일 내용')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="체크박스 목록"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('> ', '', '인용구')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="인용구"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('`', '`', '코드')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            title="인라인 코드"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={insertTimestamp}
            className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-xs"
            title="현재 시간 스탬프"
          >
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">시간 삽입</span>
          </button>
        </div>
      )}

      {/* 본문 영역 (편집, 분할, 미리보기) */}
      <div className="flex-1 flex overflow-hidden min-h-[380px]">
        {/* 편집기 영역 */}
        {viewMode !== 'preview' && (
          <div className={`flex-1 flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleChange}
              placeholder="여기에 자유롭게 메모를 작성하세요... 같은 세션 코드에 접속한 모든 사람들의 화면에 실시간으로 동기화됩니다."
              className="flex-1 w-full p-4 resize-none bg-transparent font-sans text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {/* 미리보기 영역 */}
        {viewMode !== 'edit' && (
          <div className={`flex-1 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">미리보기 (Markdown)</div>
            {renderSimpleMarkdown(localContent)}
          </div>
        )}
      </div>

      {/* 하단 상태바 */}
      <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>{charCount.toLocaleString()} 자</span>
          <span>{wordCount.toLocaleString()} 단어</span>
          <span>{lineCount} 줄</span>
        </div>
        <div className="text-slate-400">
          Markdown 문법 지원 (# 제목, - 목록, - [ ] 체크박스)
        </div>
      </div>
    </div>
  );
};
