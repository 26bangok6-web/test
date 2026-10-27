import React from 'react';
import { CheckCircle2, Printer, ExternalLink, RefreshCw, FileText, ShieldCheck } from 'lucide-react';
import { Submission, Training } from '../types';

interface ReceiptCardProps {
  submission: Submission;
  training: Training;
  onReset: () => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  submission,
  training,
  onReset,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto my-6">
      {/* Printable Certificate Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden print:border-none print:shadow-none print:p-0">
        {/* Certificate Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white px-6 py-6 text-center relative print:bg-none print:text-black print:border-b-2 print:border-black">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur-md rounded-full mb-3 ring-4 ring-white/20 print:hidden">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            직무연수 이수증 제출 확인서
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 print:text-slate-600">
            정상적으로 제출 및 취합 시스템에 접수되었습니다.
          </p>
          <div className="absolute top-4 right-4 print:hidden">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-white backdrop-blur-sm border border-emerald-400/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              접수 완료
            </span>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Main Info Grid */}
          <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500">연수 과정명</span>
              <span className="text-sm font-semibold text-slate-900 text-right mt-0.5 sm:mt-0 max-w-sm">
                {training.title}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500">이수자 성명</span>
              <span className="text-sm font-bold text-slate-900">
                {submission.traineeName}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500">이수증 발급번호</span>
              <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {submission.certNumber}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500">제출 일시</span>
              <span className="text-xs sm:text-sm text-slate-700 font-mono">
                {submission.submittedAt}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500">접수 식별 번호 (ID)</span>
              <span className="text-xs font-mono text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                {submission.id}
              </span>
            </div>

            <div className="flex justify-between py-1.5 items-center">
              <span className="text-xs font-medium text-slate-500">첨부 파일</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[200px]" title={submission.pdfFileName}>
                  {submission.pdfFileName}
                </span>
                <span className="text-slate-400">
                  ({(submission.pdfFileSize / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            </div>
          </div>

          {/* Drive & Storage Status */}
          {submission.driveFileUrl && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-900">구글 드라이브 보관함 연동됨</p>
                  <p className="text-[11px] text-blue-700">기관 드라이브 폴더에 안전하게 보관되었습니다.</p>
                </div>
              </div>
              <a
                href={submission.driveFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
              >
                드라이브 파일 보기
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Official Seal / Notice */}
          <div className="text-center pt-3 pb-1 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              본 확인서는 시스템에 정상적으로 직무연수 이수증이 접수되었음을 증명합니다.
            </p>
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-center items-center print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            확인증 인쇄하기
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            다른 이수증 추가 제출
          </button>
        </div>
      </div>
    </div>
  );
};
