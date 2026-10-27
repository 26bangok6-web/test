import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Copy,
  Download,
  RefreshCw,
  Share2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  AlertTriangle,
  FolderOpen,
  Table as TableIcon,
  Check,
  Edit,
  Code2,
} from 'lucide-react';
import { Training, Submission, RosterStatus, TrainingStats } from '../types';
import { normalizeName } from '../utils/nameParser';

interface AdminDashboardProps {
  trainings: Training[];
  selectedTrainingId: string;
  onSelectTrainingId: (id: string) => void;
  submissions: Submission[];
  onOpenCreateModal: () => void;
  onOpenEditModal: (training: Training) => void;
  onDeleteTraining: (trainingId: string) => Promise<void>;
  onOpenShareModal: (training: Training) => void;
  onOpenAppsScriptGuide: () => void;
  onPreviewPdf: (submission: Submission) => void;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  onSyncSheets: (trainingId: string) => Promise<void>;
  isSyncing: boolean;
  googleToken: string | null;
  onGoogleSignIn: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  trainings,
  selectedTrainingId,
  onSelectTrainingId,
  submissions,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteTraining,
  onOpenShareModal,
  onOpenAppsScriptGuide,
  onPreviewPdf,
  onDeleteSubmission,
  onSyncSheets,
  isSyncing,
  googleToken,
  onGoogleSignIn,
}) => {
  const currentTraining = trainings.find(t => t.id === selectedTrainingId) || trainings[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'completed' | 'pending'>('all');
  const [copiedUnsubmitted, setCopiedUnsubmitted] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTrainingConfirm, setDeleteTrainingConfirm] = useState<Training | null>(null);

  // Compute merged roster status with normalized Korean name matching
  const rosterStatuses: RosterStatus[] = useMemo(() => {
    if (!currentTraining) return [];

    const trainingSubs = submissions.filter(s => s.trainingId === currentTraining.id);

    return currentTraining.trainees.map(rawName => {
      const norm = normalizeName(rawName);
      // Find submission matching normalized name or exact name
      const matchedSub = trainingSubs.find(
        s => s.traineeNormalized === norm || normalizeName(s.traineeName) === norm
      );

      return {
        rawName,
        normalizedName: norm,
        isSubmitted: Boolean(matchedSub),
        submission: matchedSub,
      };
    });
  }, [currentTraining, submissions]);

  // Compute stats
  const stats: TrainingStats = useMemo(() => {
    const total = rosterStatuses.length;
    const submitted = rosterStatuses.filter(r => r.isSubmitted).length;
    const pending = total - submitted;
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, rate };
  }, [rosterStatuses]);

  // Filtered rows
  const filteredRoster = useMemo(() => {
    return rosterStatuses.filter(item => {
      // Status filter
      if (filterTab === 'completed' && !item.isSubmitted) return false;
      if (filterTab === 'pending' && item.isSubmitted) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const rawMatch = item.rawName.toLowerCase().includes(q);
        const normMatch = item.normalizedName.toLowerCase().includes(q);
        const certMatch = item.submission?.certNumber.toLowerCase().includes(q);
        if (!rawMatch && !normMatch && !certMatch) return false;
      }

      return true;
    });
  }, [rosterStatuses, filterTab, searchQuery]);

  // Copy unsubmitted staff list for Korean School Messengers (CoolMessenger, NEIS, etc.)
  const handleCopyUnsubmitted = () => {
    if (!currentTraining) return;
    const pendingList = rosterStatuses.filter(r => !r.isSubmitted).map(r => r.rawName);
    if (pendingList.length === 0) {
      alert('모든 대상자가 이수증 제출을 완료했습니다!');
      return;
    }

    const textToCopy = `[${currentTraining.title} 이수증 미제출자 명단 (총 ${pendingList.length}명)]\n` +
      pendingList.map((name, i) => `${i + 1}. ${name}`).join('\n') +
      `\n\n📌 이수증 온라인 제출 링크:\n${window.location.origin}/?trainingId=${currentTraining.id}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedUnsubmitted(true);
    setTimeout(() => setCopiedUnsubmitted(false), 2500);
  };

  // CSV Export with UTF-8 BOM for Korean Excel compatibility
  const handleExportCsv = () => {
    if (!currentTraining) return;

    const headers = ['연번', '성명(소속)', '정규화 성명', '제출상태', '이수번호', '제출일시', '구글 드라이브 링크'];
    const rows = rosterStatuses.map((item, idx) => [
      idx + 1,
      `"${item.rawName.replace(/"/g, '""')}"`,
      `"${item.normalizedName}"`,
      item.isSubmitted ? '이수완료' : '미제출',
      `"${item.submission?.certNumber || '-'}"`,
      `"${item.submission?.submittedAt || '-'}"`,
      `"${item.submission?.driveFileUrl || '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[취합명단]_${currentTraining.title.replace(/[\/\\:*?"<>|]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Empty state if no trainings yet
  if (!trainings || trainings.length === 0) {
    return (
      <div className="max-w-4xl mx-auto my-12 px-4">
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 sm:p-14 text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Plus className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            등록된 직무연수가 없습니다
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            더미 데이터 없이 깨끗하게 시작합니다. 첫 번째 직무연수를 개설하고 교직원 대상자 명단을 등록해보세요.
            구글 드라이브 및 스프레드시트와 실시간으로 연동됩니다.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition shadow-md cursor-pointer hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            첫 직무연수 개설하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Training Selector & Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            관리 연수 선택
          </label>
          <select
            value={currentTraining?.id}
            onChange={(e) => onSelectTrainingId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-md"
          >
            {trainings.map(t => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.trainees.length}명)
              </option>
            ))}
          </select>

          {currentTraining && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenEditModal(currentTraining)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="연수 정보 수정"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTrainingConfirm(currentTraining)}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="직무연수 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => currentTraining && onOpenShareModal(currentTraining)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            제출 링크 & QR
          </button>
          <button
            onClick={onOpenAppsScriptGuide}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-slate-500" />
            Apps Script 가이드
          </button>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            새 연수 개설
          </button>
        </div>
      </div>

      {/* Integration Status Bar */}
      {currentTraining && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">
                {currentTraining.title}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              {currentTraining.hours && <span>이수: {currentTraining.hours}시간</span>}
              {currentTraining.startDate && currentTraining.endDate && (
                <span>기간: {currentTraining.startDate} ~ {currentTraining.endDate}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentTraining.driveFolderId && (
              <a
                href={`https://drive.google.com/drive/folders/${currentTraining.driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition backdrop-blur-sm border border-white/15"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
                드라이브 폴더 열기
                <ExternalLink className="w-3 h-3 text-slate-300" />
              </a>
            )}

            {currentTraining.spreadsheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${currentTraining.spreadsheetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition backdrop-blur-sm border border-white/15"
              >
                <TableIcon className="w-3.5 h-3.5 text-emerald-300" />
                스프레드시트 열기
                <ExternalLink className="w-3 h-3 text-slate-300" />
              </a>
            )}

            <button
              onClick={() => onSyncSheets(currentTraining.id)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
              title="제출 내역을 구글 스프레드시트와 실시간 동기화"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '동기화 중...' : '시트 실시간 동기화'}
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 대상자</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">명</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">등록된 전체 교직원 명단</p>
        </div>

        {/* Submitted */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">이수 완료</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{stats.submitted}</span>
            <span className="text-xs text-emerald-700">명</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">이수증 정상 제출 및 보관</p>
        </div>

        {/* Pending */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">미제출</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{stats.pending}</span>
            <span className="text-xs text-amber-700">명</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">이수증 미제출 교직원</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">이수율</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-600">{stats.rate}%</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, stats.rate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 ({stats.total})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterTab === 'completed'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            이수완료 ({stats.submitted})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterTab === 'pending'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            미제출 ({stats.pending})
          </button>
        </div>

        {/* Search & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="성명 또는 이수번호 검색"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 1-Click Copy Unsubmitted List */}
          <button
            onClick={handleCopyUnsubmitted}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              copiedUnsubmitted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
            title="미제출자 명단을 쿨메신저/업무메신저 서식으로 복사합니다."
          >
            {copiedUnsubmitted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                명단 복사 완료!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-600" />
                미제출자 명단 1클릭 복사
              </>
            )}
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="엑셀 호환 CSV 파일로 내보내기"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV 내보내기
          </button>
        </div>

      </div>

      {/* Roster & Submissions Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">번호</th>
                <th className="py-3 px-4">성명 (소속)</th>
                <th className="py-3 px-4 text-center">제출 상태</th>
                <th className="py-3 px-4">이수번호</th>
                <th className="py-3 px-4">제출 일시</th>
                <th className="py-3 px-4 text-center">이수증 파일</th>
                <th className="py-3 px-4 text-center">구글 드라이브</th>
                <th className="py-3 px-4 text-center w-16">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoster.length > 0 ? (
                filteredRoster.map((item, idx) => (
                  <tr key={item.rawName} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <span>{item.rawName}</span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {item.isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          이수완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          미제출
                        </span>
                      )}
                    </td>

                    {/* Cert Number */}
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.submission ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.submission.certNumber}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {item.submission ? item.submission.submittedAt : '-'}
                    </td>

                    {/* PDF Preview Button */}
                    <td className="py-3 px-4 text-center">
                      {item.submission ? (
                        <button
                          onClick={() => onPreviewPdf(item.submission!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-blue-600" />
                          이수증 보기
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Google Drive Link */}
                    <td className="py-3 px-4 text-center">
                      {item.submission?.driveFileUrl ? (
                        <a
                          href={item.submission.driveFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition"
                          title="구글 드라이브 원본 보기"
                        >
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                          드라이브
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Action: Delete Submission */}
                    <td className="py-3 px-4 text-center">
                      {item.submission ? (
                        <button
                          onClick={() => setDeleteConfirmTarget({ id: item.submission!.id, name: item.rawName })}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="제출 내역 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    조건에 해당하는 대상자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Submission Confirmation Modal (Workspace guideline: User confirmation before destructive operation!) */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">제출 내역 삭제</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>[{deleteConfirmTarget.name}]</strong> 님의 이수증 제출 내역을 삭제하시겠습니까? 이 작업은 취합 시스템에서 제출 기록을 지우며 미제출 상태로 변경됩니다.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  await onDeleteSubmission(deleteConfirmTarget.id);
                  setDeleteConfirmTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
              >
                확인 및 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Training Confirmation Modal */}
      {deleteTrainingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">직무연수 삭제</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>[{deleteTrainingConfirm.title}]</strong> 연수를 삭제하시겠습니까?<br />
              등록된 모든 교직원 대상자 명단과 제출된 이수증 파일이 함께 정리됩니다.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTrainingConfirm(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  await onDeleteTraining(deleteTrainingConfirm.id);
                  setDeleteTrainingConfirm(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
              >
                직무연수 영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
