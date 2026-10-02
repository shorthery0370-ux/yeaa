import React, { useState } from 'react';
import { Plus, Check, Trash2, ListTodo } from 'lucide-react';
import { TodoItem } from '../types';

interface TodoListComponentProps {
  todos: TodoItem[];
  onUpdateTodos: (todos: TodoItem[]) => Promise<void>;
}

export const TodoListComponent: React.FC<TodoListComponentProps> = ({ todos = [], onUpdateTodos }) => {
  const [inputText, setInputText] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newTodo: TodoItem = {
      id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text: inputText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    const nextList = [...todos, newTodo];
    setInputText('');
    await onUpdateTodos(nextList);
  };

  const handleToggle = async (id: string) => {
    const nextList = todos.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    await onUpdateTodos(nextList);
  };

  const handleDelete = async (id: string) => {
    const nextList = todos.filter((item) => item.id !== id);
    await onUpdateTodos(nextList);
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            공유 할 일 목록
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {completedCount} / {todos.length} 완료
        </span>
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="함께 끝낼 작업을 추가하세요..."
          className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>추가</span>
        </button>
      </form>

      {/* 리스트 */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {todos.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400 italic">
            등록된 할 일이 없습니다. 목표를 함께 적어보세요!
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition border ${
                todo.completed
                  ? 'bg-slate-50/60 dark:bg-slate-800/40 border-transparent text-slate-400 dark:text-slate-500'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(todo.id)}
                className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                  todo.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                }`}
              >
                {todo.completed && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              <span className={`flex-1 truncate ${todo.completed ? 'line-through' : ''}`}>
                {todo.text}
              </span>

              <button
                type="button"
                onClick={() => handleDelete(todo.id)}
                className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition shrink-0"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
