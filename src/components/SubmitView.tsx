import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Upload,
  FileText,
  AlertCircle,
  Check,
  Search,
  Sparkles,
  Calendar,
  Clock,
  ChevronDown,
  X,
  FileCheck2,
} from 'lucide-react';
import { Training, Submission } from '../types';
import { normalizeName, searchRoster } from '../utils/nameParser';
import { ReceiptCard } from './ReceiptCard';

interface SubmitViewProps {
  trainings: Training[];
  selectedTrainingId?: string;
  onSelectTrainingId: (id: string) => void;
  onGoToAdmin: () => void;
}

export const SubmitView: React.FC<SubmitViewProps> = ({
  trainings,
  selectedTrainingId,
  onSelectTrainingId,
  onGoToAdmin,
}) => {
  const currentTraining = trainings.find(t => t.id === selectedTrainingId) || trainings[0];

  // Form State
  const [traineeQuery, setTraineeQuery] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Status & Validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successfulSubmission, setSuccessfulSubmission] = useState<Submission | null>(null);

  // Submissions list for duplicate check
  const [existingSubmissions, setExistingSubmissions] = useState<Submission[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load submissions for existing duplicate check
  useEffect(() => {
    if (currentTraining) {
      fetch(`/api/trainings/${currentTraining.id}/submissions`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setExistingSubmissions(data);
        })
        .catch(() => {});
    }
  }, [currentTraining?.id]);

  // Click outside to close name dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle PDF file selection & conversion to base64
  const handleFile = (file: File) => {
    setErrorMessage(null);

    // Validate PDF type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('PDF 파일만 첨부할 수 있습니다. (*.pdf)');
      return;
    }

    // Validate 25MB size limit
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage(`파일 용량이 25MB를 초과했습니다. (현재: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
      return;
    }

    setPdfFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPdfBase64(result);
    };
    reader.onerror = () => {
      setErrorMessage('파일을 읽는 도중 오류가 발생했습니다.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetForm = () => {
    setTraineeQuery('');
    setSelectedTrainee('');
    setCertNumber('');
    setPdfFile(null);
    setPdfBase64(null);
    setErrorMessage(null);
    setSuccessfulSubmission(null);
  };

  // Check if currently selected trainee already submitted
  const alreadySubmitted = Boolean(
    selectedTrainee &&
    existingSubmissions.some(
      s => s.traineeNormalized === normalizeName(selectedTrainee)
    )
  );

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentTraining) {
      setErrorMessage('제출할 직무연수를 먼저 선택해주세요.');
      return;
    }
    const trainee = selectedTrainee || traineeQuery.trim();
    if (!trainee) {
      setErrorMessage('이수 대상자 본인의 성명을 명단에서 선택해주세요.');
      return;
    }
    if (!certNumber.trim()) {
      setErrorMessage('이수증에 기재된 이수번호(발급번호)를 입력해주세요.');
      return;
    }
    if (!pdfBase64 || !pdfFile) {
      setErrorMessage('이수증 PDF 파일을 첨부해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/trainings/${currentTraining.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeName: trainee,
          traineeNormalized: normalizeName(trainee),
          certNumber: certNumber.trim(),
          pdfBase64,
          pdfFileName: pdfFile.name,
          pdfFileSize: pdfFile.size,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '제출 처리 중 오류가 발생했습니다.');
      }

      // Success! Fire celebratory confetti
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#3B82F6', '#6366F1'],
      });

      setSuccessfulSubmission(data.submission);
    } catch (err: any) {
      setErrorMessage(err.message || '서버와 통신할 수 없습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no trainings exist yet
  if (!trainings || trainings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          개설된 직무연수가 없습니다
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          현재 교직원에게 제공되는 직무연수 제출 창구가 준비되지 않았습니다.<br />
          연수 담당 관리자이신가요? 관리자 현황판에서 첫 번째 직무연수를 개설해보세요.
        </p>
        <button
          onClick={onGoToAdmin}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
        >
          직무연수 개설하러 가기
        </button>
      </div>
    );
  }

  // If submission was successful, show Receipt Card
  if (successfulSubmission && currentTraining) {
    return (
      <ReceiptCard
        submission={successfulSubmission}
        training={currentTraining}
        onReset={handleResetForm}
      />
    );
  }

  const filteredRoster = currentTraining ? searchRoster(traineeQuery, currentTraining.trainees) : [];

  return (
    <div className="max-w-2xl mx-auto my-6 px-4">
      {/* Educational Notice Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-blue-200 backdrop-blur-sm border border-white/10 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          로그인 없이 즉시 제출
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          직무연수 이수증 온라인 제출
        </h1>
        <p className="text-blue-200/90 text-xs sm:text-sm mt-2 leading-relaxed">
          본인 성명을 선택하고 이수번호와 PDF 이수증을 첨부하시면 기관 취합 시스템에 즉시 등록됩니다.
        </p>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* 1. 직무연수 선택 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. 연수 과정 선택 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={currentTraining?.id}
              onChange={(e) => {
                onSelectTrainingId(e.target.value);
                setTraineeQuery('');
                setSelectedTrainee('');
              }}
              className="w-full appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              {trainings.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.hours ? `(${t.hours}시간)` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Training Info Chips */}
          {currentTraining && (
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-slate-500">
              {currentTraining.hours && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                  <Clock className="w-3 h-3 text-slate-400" />
                  이수인정: {currentTraining.hours}시간
                </span>
              )}
              {currentTraining.startDate && currentTraining.endDate && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  연수기간: {currentTraining.startDate} ~ {currentTraining.endDate}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. 대상자 본인 성명 선택 (실시간 자동완성) */}
        <div ref={dropdownRef} className="relative">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. 이수 대상자 성명 <span className="text-rose-500">*</span>
            </label>
            {selectedTrainee && (
              <span className="text-xs text-blue-600 font-medium">
                선택됨: {selectedTrainee}
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={traineeQuery}
              onChange={(e) => {
                setTraineeQuery(e.target.value);
                setSelectedTrainee('');
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="본인 성명을 입력하면 명단에서 자동완성됩니다 (예: 홍길동)"
              className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {traineeQuery && (
              <button
                type="button"
                onClick={() => {
                  setTraineeQuery('');
                  setSelectedTrainee('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && currentTraining?.trainees && currentTraining.trainees.length > 0 && (
            <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredRoster.length > 0 ? (
                filteredRoster.map((name) => {
                  const isSelected = selectedTrainee === name;
                  const isAlready = existingSubmissions.some(
                    s => s.traineeNormalized === normalizeName(name)
                  );
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedTrainee(name);
                        setTraineeQuery(name);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition cursor-pointer ${
                        isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {name}
                        {isAlready && (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                            제출완료
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-xs text-slate-500 text-center">
                  일치하는 대상자가 없습니다. 직접 입력된 이름으로 제출됩니다.
                </div>
              )}
            </div>
          )}

          {/* Notice if already submitted */}
          {alreadySubmitted && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>안내:</strong> 이미 등록된 이수증이 있습니다. 다시 제출하시면 최신 파일로 업데이트됩니다.
              </span>
            </div>
          )}
        </div>

        {/* 3. 이수번호 입력 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            3. 이수번호 (발급번호) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
            placeholder="이수증에 표기된 발급번호를 입력하세요 (예: 제2026-0312호)"
            className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            이수증 상단 또는 하단에 표기된 등록/인가 번호를 정확히 기재해주세요.
          </p>
        </div>

        {/* 4. 이수증 PDF 첨부 (드래그 앤 드롭 & 25MB 검사) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            4. 이수증 PDF 파일 첨부 <span className="text-rose-500">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {!pdfFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                PDF 파일을 여기에 끌어다 놓거나 클릭하여 선택
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PDF 포맷만 지원 • 최대 25MB 용량 지원
              </p>
            </div>
          ) : (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                    {pdfFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    용량: {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • 정상 확인됨
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPdfFile(null);
                  setPdfBase64(null);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="파일 삭제"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button (Zero Login required) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 px-6 rounded-xl text-white font-bold text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>안전하게 취합 시스템에 제출 중...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>이수증 제출 완료하기</span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-400">
          제출 즉시 관리자 현황판 및 기관 연동 저장소에 기록되며 확인증이 발급됩니다.
        </p>
      </form>
    </div>
  );
};
