import React from 'react';
import { User } from 'firebase/auth';
import {
  GraduationCap,
  FileCheck,
  LayoutDashboard,
  LogOut,
  Radio,
  Shield,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'submit' | 'admin';
  onSelectTab: (tab: 'submit' | 'admin') => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  isLoggingIn: boolean;
  sseConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onGoogleSignIn,
  onGoogleLogout,
  isLoggingIn,
  sseConnected,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 print:hidden shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  직무연수 이수증 취합
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/80 text-blue-200 border border-blue-700">
                  교육기관용
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                무로그인 제출 및 구글 드라이브·스프레드시트 자동 취합 시스템
              </p>
            </div>
          </div>

          {/* Center: Mode Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => onSelectTab('submit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'submit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>교직원 제출</span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>관리자 현황판</span>
            </button>
          </nav>

          {/* Right Area: Real-time SSE indicator & Admin Auth */}
          <div className="flex items-center gap-3">
            {/* Realtime Pulse */}
            <div
              className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700"
              title={sseConnected ? '실시간 연동 중 (서버 푸시 활성)' : '실시간 연결 대기 중'}
            >
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{sseConnected ? '실시간 연동' : '연결 중'}</span>
            </div>

            {/* Admin Google Auth (ONLY shown in admin mode to keep submit mode 100% login-free) */}
            {currentTab === 'admin' && (
              <div>
                {user ? (
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 py-1 px-2.5 rounded-xl">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-6 h-6 rounded-full border border-slate-600"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-[11px] flex items-center justify-center font-bold">
                        {user.displayName?.[0] || '관'}
                      </div>
                    )}
                    <span className="text-xs text-slate-200 font-medium hidden md:inline truncate max-w-[120px]">
                      {user.displayName || user.email}
                    </span>
                    <button
                      onClick={onGoogleLogout}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded-md transition"
                      title="구글 계정 연결 해제"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onGoogleSignIn}
                    disabled={isLoggingIn}
                    className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span>{isLoggingIn ? '연결 중...' : '관리자 구글 연결'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
