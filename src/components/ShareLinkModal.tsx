import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ExternalLink, Share2, Smartphone } from 'lucide-react';
import { Training } from '../types';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: Training | null;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, training }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !training) return null;

  const origin = window.location.origin;
  const shareUrl = `${origin}/?trainingId=${encodeURIComponent(training.id)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Generate QR code image URL using standard public chart QR API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold">교직원 제출 링크 및 QR 코드</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{training.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              교직원 메신저(쿨메신저/업무메신저)나 공문에 아래 링크를 공유하세요.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 inline-block mx-auto shadow-inner">
            <img
              src={qrImageUrl}
              alt="QR Code"
              className="w-44 h-44 mx-auto rounded-lg"
              loading="lazy"
            />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-slate-600 text-[11px] font-medium">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              스마트폰 카메라로 스캔하여 즉시 제출
            </div>
          </div>

          {/* Link Box */}
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 text-left">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent border-none text-xs text-slate-800 font-mono px-2 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  링크 복사
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
