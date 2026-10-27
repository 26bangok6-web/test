import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SubmitView } from './components/SubmitView';
import { AdminDashboard } from './components/AdminDashboard';
import { CreateTrainingModal } from './components/CreateTrainingModal';
import { AppsScriptModal } from './components/AppsScriptModal';
import { ShareLinkModal } from './components/ShareLinkModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { Training, Submission } from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/googleAuth';
import { playNotificationChime } from './utils/audio';

interface Toast {
  id: string;
  message: string;
  traineeName: string;
  trainingTitle?: string;
  timestamp: string;
}

export default function App() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentTab, setCurrentTab] = useState<'submit' | 'admin'>('submit');

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Real-time SSE & Network status
  const [sseConnected, setSseConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);
  const [shareModalTraining, setShareModalTraining] = useState<Training | null>(null);
  const [previewPdfSubmission, setPreviewPdfSubmission] = useState<Submission | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check URL query parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTrainingId = params.get('trainingId');
    const paramTab = params.get('tab');

    if (paramTrainingId) {
      setSelectedTrainingId(paramTrainingId);
      setCurrentTab('submit');
    } else if (paramTab === 'admin') {
      setCurrentTab('admin');
    }
  }, []);

  // Initialize Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAdminUser(user);
        setAdminToken(token);
        // Sync token with server memory
        fetch('/api/admin/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      },
      () => {
        setAdminUser(null);
        setAdminToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Sign-in for Admin
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAdminUser(result.user);
        setAdminToken(result.accessToken);
        await fetch('/api/admin/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: result.accessToken }),
        });
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      alert(`구글 로그인 실패: ${err.message || '인증이 취소되었거나 오류가 발생했습니다.'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    const confirmed = window.confirm('구글 관리자 계정 연동을 해제하시겠습니까?');
    if (!confirmed) return;

    await logout();
    setAdminUser(null);
    setAdminToken(null);
    await fetch('/api/admin/set-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: null }),
    });
  };

  // Fetch all trainings
  const fetchTrainings = useCallback(async () => {
    try {
      const res = await fetch('/api/trainings');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrainings(data);
        if (data.length > 0 && !selectedTrainingId) {
          setSelectedTrainingId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching trainings:', err);
    }
  }, [selectedTrainingId]);

  // Fetch submissions for currently selected training
  const fetchSubmissions = useCallback(async (trainingId: string) => {
    if (!trainingId) return;
    try {
      const res = await fetch(`/api/trainings/${trainingId}/submissions`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  // When selected training changes
  useEffect(() => {
    if (selectedTrainingId) {
      fetchSubmissions(selectedTrainingId);
    } else if (trainings.length > 0) {
      setSelectedTrainingId(trainings[0].id);
    }
  }, [selectedTrainingId, trainings, fetchSubmissions]);

  // Real-time Server-Sent Events (SSE) Setup
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('connected', () => {
      setSseConnected(true);
    });

    eventSource.addEventListener('submission:new', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const { submission, trainingTitle } = parsed;

        // Play chime sound
        playNotificationChime();

        // Add toast
        const newToast: Toast = {
          id: 'toast-' + Date.now(),
          message: `🔔 [${submission.traineeName}] 님의 이수증이 방금 제출되었습니다!`,
          traineeName: submission.traineeName,
          trainingTitle,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };

        setToasts(prev => [newToast, ...prev.slice(0, 4)]);

        // Auto remove toast after 6s
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 6000);

        // Update submissions if current training matches
        if (submission.trainingId === selectedTrainingId) {
          setSubmissions(prev => {
            const idx = prev.findIndex(s => s.id === submission.id || s.traineeNormalized === submission.traineeNormalized);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = submission;
              return updated;
            }
            return [submission, ...prev];
          });
        }
      } catch (err) {
        console.error('Error handling SSE submission:new:', err);
      }
    });

    eventSource.addEventListener('submission:deleted', (e: MessageEvent) => {
      try {
        const { id, trainingId } = JSON.parse(e.data);
        if (trainingId === selectedTrainingId) {
          setSubmissions(prev => prev.filter(s => s.id !== id));
        }
      } catch {}
    });

    eventSource.addEventListener('training:updated', () => {
      fetchTrainings();
    });

    eventSource.addEventListener('sync:complete', (e: MessageEvent) => {
      try {
        const { trainingId } = JSON.parse(e.data);
        if (trainingId === selectedTrainingId) {
          fetchSubmissions(trainingId);
        }
      } catch {}
    });

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    // Background 12s polling fallback
    const interval = setInterval(() => {
      if (selectedTrainingId) {
        fetchSubmissions(selectedTrainingId);
      }
    }, 12000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [selectedTrainingId, fetchTrainings, fetchSubmissions]);

  // Save new or edited training
  const handleSaveTraining = async (trainingData: Partial<Training>) => {
    if (editingTraining) {
      // Edit
      const res = await fetch(`/api/trainings/${editingTraining.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingData),
      });
      if (!res.ok) throw new Error('직무연수 정보 수정에 실패했습니다.');
    } else {
      // Create
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingData),
      });
      if (!res.ok) throw new Error('직무연수 개설에 실패했습니다.');
      const created = await res.json();
      setSelectedTrainingId(created.id);
    }
    await fetchTrainings();
    setEditingTraining(null);
  };

  // Delete training
  const handleDeleteTraining = async (trainingId: string) => {
    const res = await fetch(`/api/trainings/${trainingId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('연수 삭제에 실패했습니다.');
    const remaining = trainings.filter(t => t.id !== trainingId);
    setTrainings(remaining);
    if (remaining.length > 0) {
      setSelectedTrainingId(remaining[0].id);
    } else {
      setSelectedTrainingId('');
      setSubmissions([]);
    }
  };

  // Delete submission
  const handleDeleteSubmission = async (submissionId: string) => {
    const res = await fetch(`/api/submissions/${submissionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('제출 삭제에 실패했습니다.');
    setSubmissions(prev => prev.filter(s => s.id !== submissionId));
  };

  // Manual Sync with Sheets
  const handleSyncSheets = async (trainingId: string) => {
    let token = adminToken;
    if (!token) {
      token = await getAccessToken();
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId, token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`구글 스프레드시트 동기화 완료! (동기화된 건수: ${data.syncedCount}건)`);
        await fetchSubmissions(trainingId);
      } else {
        alert(`동기화 실패: ${data.error || '스프레드시트에 연결할 수 없습니다.'}`);
      }
    } catch (err: any) {
      alert(`동기화 오류: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={adminUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleLogout={handleGoogleLogout}
        isLoggingIn={isLoggingIn}
        sseConnected={sseConnected}
      />

      {/* Real-time Toast Notifications (Top Right) */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-top-3 duration-300"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{toast.message}</p>
                {toast.trainingTitle && (
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                    {toast.trainingTitle}
                  </p>
                )}
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  {toast.timestamp}
                </span>
              </div>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'submit' ? (
          <SubmitView
            trainings={trainings}
            selectedTrainingId={selectedTrainingId}
            onSelectTrainingId={setSelectedTrainingId}
            onGoToAdmin={() => setCurrentTab('admin')}
          />
        ) : (
          <AdminDashboard
            trainings={trainings}
            selectedTrainingId={selectedTrainingId}
            onSelectTrainingId={setSelectedTrainingId}
            submissions={submissions}
            onOpenCreateModal={() => {
              setEditingTraining(null);
              setIsCreateModalOpen(true);
            }}
            onOpenEditModal={(training) => {
              setEditingTraining(training);
              setIsCreateModalOpen(true);
            }}
            onDeleteTraining={handleDeleteTraining}
            onOpenShareModal={(training) => setShareModalTraining(training)}
            onOpenAppsScriptGuide={() => setIsAppsScriptModalOpen(true)}
            onPreviewPdf={(sub) => setPreviewPdfSubmission(sub)}
            onDeleteSubmission={handleDeleteSubmission}
            onSyncSheets={handleSyncSheets}
            isSyncing={isSyncing}
            googleToken={adminToken}
            onGoogleSignIn={handleGoogleSignIn}
          />
        )}
      </main>

      {/* Modals */}
      <CreateTrainingModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTraining(null);
        }}
        onSave={handleSaveTraining}
        editTraining={editingTraining}
        onOpenAppsScriptGuide={() => setIsAppsScriptModalOpen(true)}
        googleToken={adminToken}
      />

      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
      />

      <ShareLinkModal
        isOpen={Boolean(shareModalTraining)}
        onClose={() => setShareModalTraining(null)}
        training={shareModalTraining}
      />

      <PdfViewerModal
        submission={previewPdfSubmission}
        onClose={() => setPreviewPdfSubmission(null)}
      />

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 print:hidden">
        <p>
          직무연수 이수증 및 명단 자동 취합 시스템 • 완전 무로그인 교직원 제출 및 구글 드라이브·스프레드시트 실시간 연동
        </p>
      </footer>
    </div>
  );
}
