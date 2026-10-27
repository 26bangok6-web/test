import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';
import { Submission } from '../types';

interface PdfViewerModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ submission, onClose }) => {
  if (!submission) return null;

  const fileUrl = `/api/submissions/${submission.id}/file`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-md">
                이수증 미리보기 - {submission.traineeName} ({submission.certNumber})
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {submission.pdfFileName} • 제출일시: {submission.submittedAt}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={submission.pdfFileName}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </a>
            {submission.driveFileUrl && (
              <a
                href={submission.driveFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                드라이브
              </a>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
          <iframe
            src={`${fileUrl}#toolbar=1`}
            title="PDF Preview"
            className="w-full h-full rounded-xl border border-slate-300 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
