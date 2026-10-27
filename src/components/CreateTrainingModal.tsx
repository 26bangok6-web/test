import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Table,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Link2,
} from 'lucide-react';
import { Training } from '../types';
import { parseRosterInput } from '../utils/nameParser';
import { extractDriveFolderId, extractSheetId } from '../utils/googleIdExtractor';

interface CreateTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (training: Partial<Training>) => Promise<void>;
  editTraining?: Training | null;
  onOpenAppsScriptGuide: () => void;
  googleToken: string | null;
}

export const CreateTrainingModal: React.FC<CreateTrainingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTraining,
  onOpenAppsScriptGuide,
  googleToken,
}) => {
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState<string | number>('15');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rosterRawText, setRosterRawText] = useState('');
  const [driveFolderInput, setDriveFolderInput] = useState('');
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');

  // Test states
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{ success: boolean; message: string; tabs?: string[] } | null>(null);

  const [isTestingAppsScript, setIsTestingAppsScript] = useState(false);
  const [appsScriptTestResult, setAppsScriptTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editTraining) {
      setTitle(editTraining.title || '');
      setHours(editTraining.hours || '15');
      setStartDate(editTraining.startDate || '');
      setEndDate(editTraining.endDate || '');
      setRosterRawText((editTraining.trainees || []).join('\n'));
      setDriveFolderInput(editTraining.driveFolderId || '');
      setSpreadsheetInput(editTraining.spreadsheetId || '');
      setAppsScriptUrl(editTraining.appsScriptUrl || '');
    } else {
      setTitle('');
      setHours('15');
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setStartDate(now.toISOString().split('T')[0]);
      setEndDate(nextMonth.toISOString().split('T')[0]);
      setRosterRawText('');
      setDriveFolderInput('');
      setSpreadsheetInput('');
      setAppsScriptUrl('');
    }
    setDriveTestResult(null);
    setSheetsTestResult(null);
    setAppsScriptTestResult(null);
    setFormError(null);
  }, [editTraining, isOpen]);

  if (!isOpen) return null;

  const parsedRoster = parseRosterInput(rosterRawText);

  // Test Google Drive Folder
  const handleTestDrive = async () => {
    const folderId = extractDriveFolderId(driveFolderInput);
    if (!folderId) {
      setDriveTestResult({ success: false, message: '드라이브 폴더 주소 또는 ID를 입력해주세요.' });
      return;
    }
    setIsTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await fetch('/api/test/google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, token: googleToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDriveTestResult({
          success: true,
          message: `폴더 연결 성공! [${data.folderName}] (${data.folderId})`,
        });
      } else {
        setDriveTestResult({
          success: false,
          message: data.error || '드라이브 폴더에 접근할 수 없습니다. 관리자 계정 로그인을 확인해주세요.',
        });
      }
    } catch (err: any) {
      setDriveTestResult({ success: false, message: `테스트 실패: ${err.message}` });
    } finally {
      setIsTestingDrive(false);
    }
  };

  // Test Google Sheets
  const handleTestSheets = async () => {
    const spreadsheetId = extractSheetId(spreadsheetInput);
    if (!spreadsheetId) {
      setSheetsTestResult({ success: false, message: '스프레드시트 주소 또는 ID를 입력해주세요.' });
      return;
    }
    setIsTestingSheets(true);
    setSheetsTestResult(null);
    try {
      const res = await fetch('/api/test/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, token: googleToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSheetsTestResult({
          success: true,
          message: `시트 연결 성공! [${data.spreadsheetTitle}] • 기본 탭: '${data.firstTab}' 감지`,
          tabs: data.sheets,
        });
      } else {
        setSheetsTestResult({
          success: false,
          message: data.error || '스프레드시트에 접근할 수 없습니다. 관리자 계정 로그인을 확인해주세요.',
        });
      }
    } catch (err: any) {
      setSheetsTestResult({ success: false, message: `테스트 실패: ${err.message}` });
    } finally {
      setIsTestingSheets(false);
    }
  };

  // Test Apps Script Web App
  const handleTestAppsScript = async () => {
    if (!appsScriptUrl.trim()) {
      setAppsScriptTestResult({ success: false, message: 'Apps Script 웹 앱 URL을 입력해주세요.' });
      return;
    }
    setIsTestingAppsScript(true);
    setAppsScriptTestResult(null);
    try {
      const res = await fetch('/api/test/apps-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appsScriptUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppsScriptTestResult({
          success: true,
          message: 'Apps Script 웹 앱 통신 성공! 무로그인 저장이 정상 활성화되었습니다.',
        });
      } else {
        setAppsScriptTestResult({
          success: false,
          message: data.error || 'Apps Script 웹 앱과 연결할 수 없습니다. 배포 설정을 확인해주세요.',
        });
      }
    } catch (err: any) {
      setAppsScriptTestResult({ success: false, message: `연결 테스트 실패: ${err.message}` });
    } finally {
      setIsTestingAppsScript(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('직무연수명을 입력해주세요.');
      return;
    }

    if (parsedRoster.length === 0) {
      setFormError('이수 대상자 명단을 최소 1명 이상 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        hours: hours || 0,
        startDate,
        endDate,
        trainees: parsedRoster,
        driveFolderId: extractDriveFolderId(driveFolderInput),
        spreadsheetId: extractSheetId(spreadsheetInput),
        appsScriptUrl: appsScriptUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {editTraining ? '직무연수 정보 수정' : '새 직무연수 개설'}
            </h3>
            <p className="text-xs text-slate-300">
              연수 기본정보와 대상자 명단, 저장할 구글 드라이브 및 스프레드시트를 지정합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm">
          
          {/* 1. 직무연수명 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              직무연수명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026학년도 디지털 AI 기반 학생 맞춤형 교육 직무연수"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
            />
          </div>

          {/* 2. 이수 시간 & 연수 기간 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                이수 시간
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="예: 15"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">시간</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 3. 대상자 명단 입력 (줄바꿈/쉼표 자동 파싱) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                이수 대상자 명단 <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                인식된 대상자: {parsedRoster.length}명
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={rosterRawText}
              onChange={(e) => setRosterRawText(e.target.value)}
              placeholder="엑셀이나 한글에서 대상자 명단을 복사해 붙여넣으세요. (줄바꿈 또는 쉼표 구분)&#10;예시:&#10;홍길동 (교무부)&#10;김철수 (연구부)&#10;이영희 (1학년부)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
            />
            {/* Live Preview Chips */}
            {parsedRoster.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-100/70 rounded-xl border border-slate-200 text-xs">
                {parsedRoster.slice(0, 10).map((name, i) => (
                  <span key={i} className="inline-flex items-center bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 text-[11px]">
                    {name}
                  </span>
                ))}
                {parsedRoster.length > 10 && (
                  <span className="text-slate-400 text-[11px] self-center pl-1">
                    외 {parsedRoster.length - 10}명...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              구글 드라이브 & 스프레드시트 연동 설정
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              제출된 이수증 PDF는 구글 드라이브에 저장되고, 이수 내역은 스프레드시트에 자동 기록됩니다.
            </p>
          </div>

          {/* 4. 구글 드라이브 폴더 주소/ID & 테스트 버튼 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              구글 드라이브 폴더 주소 또는 ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={driveFolderInput}
                onChange={(e) => setDriveFolderInput(e.target.value)}
                placeholder="예: https://drive.google.com/drive/folders/1ABC... 또는 폴더 ID"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTestDrive}
                disabled={isTestingDrive}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer"
              >
                {isTestingDrive ? '확인 중...' : '드라이브 연결 테스트'}
              </button>
            </div>
            {driveTestResult && (
              <div className={`mt-1.5 text-xs flex items-center gap-1.5 ${driveTestResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                {driveTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{driveTestResult.message}</span>
              </div>
            )}
          </div>

          {/* 5. 구글 스프레드시트 주소/ID & 테스트 버튼 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              구글 스프레드시트 주소 또는 ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={spreadsheetInput}
                onChange={(e) => setSpreadsheetInput(e.target.value)}
                placeholder="예: https://docs.google.com/spreadsheets/d/1XYZ.../edit 또는 시트 ID"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTestSheets}
                disabled={isTestingSheets}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer"
              >
                {isTestingSheets ? '확인 중...' : '시트 연결 테스트'}
              </button>
            </div>
            {sheetsTestResult && (
              <div className={`mt-1.5 text-xs flex items-center gap-1.5 ${sheetsTestResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                {sheetsTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{sheetsTestResult.message}</span>
              </div>
            )}
          </div>

          {/* 6. Apps Script 웹 앱 URL (영구 무로그인 파이프라인) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                Apps Script 웹 앱 URL (영구 무로그인 배포용)
              </label>
              <button
                type="button"
                onClick={onOpenAppsScriptGuide}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-0.5"
              >
                원클릭 코드 & 배포 가이드 보기
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              구글 시트에 웹 앱 스크립트를 배포해 URL을 등록하면 교직원들의 무로그인 업로드가 영구 자동화됩니다.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTestAppsScript}
                disabled={isTestingAppsScript}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer"
              >
                {isTestingAppsScript ? '확인 중...' : '연결 테스트'}
              </button>
            </div>
            {appsScriptTestResult && (
              <div className={`mt-1.5 text-xs flex items-center gap-1.5 ${appsScriptTestResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                {appsScriptTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{appsScriptTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Form Error */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : editTraining ? '수정 사항 저장' : '직무연수 개설 완료'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
