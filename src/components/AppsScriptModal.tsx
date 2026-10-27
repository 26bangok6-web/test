import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, HelpCircle, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { getAppsScriptCode } from '../utils/appsScriptTemplate';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const scriptCode = getAppsScriptCode();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Google Apps Script 영구 무로그인 배포 가이드</h3>
              <p className="text-xs text-blue-200">교직원 로그인 없는 영구 자동 취합 파이프라인 (1분 완성)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm text-slate-700">
          
          {/* Why this is powerful */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-blue-900">
              <strong>왜 Apps Script 웹 앱을 사용하나요?</strong><br />
              관리자가 최초 1회 스프레드시트에 웹 앱을 배포해 두면, 일반 교직원은 <strong>구글 계정 로그인이나 권한 허용 없이도</strong> 제출한 PDF를 관리자의 드라이브 폴더에 즉시 저장하고 시트에 새 행을 자동 기록할 수 있습니다.
            </div>
          </div>

          {/* 4 Steps */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">1</span>
              스프레드시트에 스크립트 붙여넣기 및 배포 순서
            </h4>

            <ol className="space-y-3 pl-2">
              <li className="flex items-start gap-2 text-xs">
                <span className="font-bold text-blue-600 min-w-14">단계 1:</span>
                <span>취합용 <strong>구글 스프레드시트</strong>를 열고 상단 메뉴의 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭합니다.</span>
              </li>
              <li className="flex items-start gap-2 text-xs">
                <span className="font-bold text-blue-600 min-w-14">단계 2:</span>
                <span>편집기에 기본으로 적힌 <code>function myFunction() &#123;&#125;</code> 코드를 <strong>모두 지우고</strong>, 아래 [스크립트 코드 복사] 버튼을 눌러 복사한 코드를 붙여넣은 뒤 <strong>저장(Ctrl+S)</strong>합니다.</span>
              </li>
              <li className="flex items-start gap-2 text-xs">
                <span className="font-bold text-blue-600 min-w-14">단계 3:</span>
                <span>
                  우측 상단 <strong>[배포] → [새 배포]</strong>를 클릭하고, 톱니바퀴 아이콘을 눌러 <strong>[웹 앱]</strong>을 선택합니다.<br />
                  <span className="inline-block mt-1 bg-amber-50 text-amber-900 px-2 py-1 rounded border border-amber-200">
                    ⚠️ <strong>[액세스 권한이 있는 사용자]</strong>를 반드시 <strong>'모든 사용자(Anyone)'</strong>로 선택해야 교직원이 로그인 없이 제출할 수 있습니다!
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2 text-xs">
                <span className="font-bold text-blue-600 min-w-14">단계 4:</span>
                <span>배포 완료 후 화면에 표시되는 <strong>'웹 앱 URL'</strong>(<code>https://script.google.com/macros/s/.../exec</code>)을 복사하여 연수 개설 화면의 [Apps Script URL] 란에 등록합니다.</span>
              </li>
            </ol>
          </div>

          {/* Script Code Block */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Terminal className="w-4 h-4 text-slate-500" />
                원클릭 복사 스크립트 코드
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    클립보드에 복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    스크립트 코드 전체 복사
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto max-h-64 font-mono leading-relaxed border border-slate-800 select-all">
              {scriptCode}
            </pre>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
