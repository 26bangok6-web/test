/**
 * Generates Google Apps Script code for 100% Zero-Login Drive & Sheet integration.
 * Teachers submit without Google login, while the Apps Script executes under the admin's Google account!
 */

export function getAppsScriptCode(): string {
  return `/**
 * [직무연수 이수증 자동 취합 시스템 - 구글 드라이브 & 시트 연동 스크립트]
 * 
 * 1. 이 스크립트는 교직원이 구글 로그인 없이도 제출한 이수증 PDF를
 *    구글 드라이브 폴더에 자동 업로드하고 스프레드시트에 행을 자동 기록합니다.
 * 2. 한국어 환경 시트('시트1') 및 다국어 환경('Sheet1')을 자동 감지합니다.
 * 3. 첫 번째 행이 비어있는 경우 필수 헤더 행을 자동으로 생성합니다.
 */

// 1. GET 요청 (연결 상태 테스트용)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "직무연수 이수증 취합 Apps Script 서버가 정상 작동 중입니다.",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// 2. POST 요청 (이수증 PDF 업로드 및 시트 행 기록)
function doPost(e) {
  var lock = LockService.getScriptLock();
  // 동시 제출 시 충돌 방지 (최대 30초 대기)
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "요청 본문(Body) 데이터가 비어 있습니다." });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || "submit";

    // 단순 연결 테스트 액션
    if (action === "ping") {
      return jsonResponse({
        success: true,
        message: "연결 성공! Apps Script가 정상 응답했습니다."
      });
    }

    // 필수 파라미터 확인
    var folderId = data.folderId;
    var spreadsheetId = data.spreadsheetId;
    var trainingTitle = data.trainingTitle || "직무연수";
    var traineeName = data.traineeName || "이수자";
    var certNumber = data.certNumber || "-";
    var pdfBase64 = data.pdfBase64;
    var pdfFileName = data.pdfFileName || (trainingTitle + "_" + traineeName + "_" + certNumber + "_이수증.pdf");
    var submissionId = data.submissionId || ("SUB-" + Date.now());
    var submittedAt = data.submittedAt || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

    var driveFileUrl = "";
    var driveFileId = "";

    // 1) 구글 드라이브 폴더에 PDF 저장
    if (folderId && pdfBase64) {
      try {
        var folder = DriveApp.getFolderById(folderId);
        // Clean safe filename: [연수명] 성명_이수번호_이수증.pdf
        var safeTitle = trainingTitle.replace(/[\/\\\\:*?"<>|]/g, "_");
        var safeName = traineeName.replace(/[\/\\\\:*?"<>|]/g, "_");
        var safeCert = certNumber.replace(/[\/\\\\:*?"<>|]/g, "_");
        var finalFileName = "[" + safeTitle + "] " + safeName + "_" + safeCert + "_이수증.pdf";

        var decodedBytes = Utilities.base64Decode(pdfBase64);
        var blob = Utilities.newBlob(decodedBytes, "application/pdf", finalFileName);
        var file = folder.createFile(blob);
        
        // 링크가 있는 모든 사용자 읽기 권한 부여 (필요 시)
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          // 도메인 제한된 기관 계정인 경우 무시
        }

        driveFileId = file.getId();
        driveFileUrl = file.getUrl();
      } catch (driveErr) {
        Logger.log("드라이브 저장 오류: " + driveErr.toString());
      }
    }

    // 2) 구글 스프레드시트에 행 추가
    if (spreadsheetId) {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      // 영문 'Sheet1' 하드코딩 금지: 실제 존재하는 첫 번째 탭 동적 취득
      var sheets = ss.getSheets();
      if (!sheets || sheets.length === 0) {
        throw new Error("스프레드시트에 시트(탭)가 존재하지 않습니다.");
      }
      var targetSheet = sheets[0];

      // 첫 번째 행이 비어있으면 헤더 행 자동 생성
      var lastRow = targetSheet.getLastRow();
      if (lastRow === 0) {
        var headers = [
          "이수번호",
          "이수명",
          "이수자 이름",
          "이수일시",
          "이수증 링크",
          "제출구분",
          "제출 ID"
        ];
        targetSheet.appendRow(headers);
        // 헤더 스타일링 (배경색, 굵게)
        var headerRange = targetSheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#E8EEF5");
      }

      // 새 제출 행 추가
      var newRow = [
        certNumber,
        trainingTitle,
        traineeName,
        submittedAt,
        driveFileUrl || "파일 저장 안 됨",
        "온라인 무로그인 제출",
        submissionId
      ];
      targetSheet.appendRow(newRow);
    }

    return jsonResponse({
      success: true,
      submissionId: submissionId,
      driveFileId: driveFileId,
      driveFileUrl: driveFileUrl,
      submittedAt: submittedAt,
      message: "성공적으로 구글 드라이브 및 스프레드시트에 등록되었습니다."
    });

  } catch (err) {
    Logger.log("처리 오류: " + err.toString());
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
