import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// High payload limit for 25MB PDF file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories for local data persistence and PDF files
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface TrainingRecord {
  id: string;
  title: string;
  hours: number | string;
  startDate: string;
  endDate: string;
  trainees: string[];
  driveFolderId: string;
  spreadsheetId: string;
  appsScriptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionRecord {
  id: string;
  trainingId: string;
  traineeName: string;
  traineeNormalized: string;
  certNumber: string;
  submittedAt: string;
  pdfFileName: string;
  pdfFileSize: number;
  driveFileId?: string;
  driveFileUrl?: string;
  sheetSynced?: boolean;
}

interface Database {
  trainings: TrainingRecord[];
  submissions: SubmissionRecord[];
}

// In-memory token cache for admin (never written to disk)
let inMemoryAdminToken: string | null = null;

// Load initial database (starts empty as requested)
function loadDatabase(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        trainings: Array.isArray(parsed.trainings) ? parsed.trainings : [],
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      };
    }
  } catch (err) {
    console.error('Error loading db.json:', err);
  }
  return { trainings: [], submissions: [] };
}

const db: Database = loadDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Server-Sent Events (SSE) connections
const sseClients: Set<Response> = new Set();

function broadcastEvent(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SSE endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Initial welcome event
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  // Keep alive heartbeat every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Admin Google Access Token store in server memory
app.post('/api/admin/set-token', (req: Request, res: Response) => {
  const { token } = req.body;
  inMemoryAdminToken = token || null;
  res.json({ success: true, hasToken: !!inMemoryAdminToken });
});

app.get('/api/admin/token-status', (req: Request, res: Response) => {
  res.json({ hasToken: !!inMemoryAdminToken });
});

// Trainings API
app.get('/api/trainings', (req: Request, res: Response) => {
  res.json(db.trainings);
});

app.post('/api/trainings', (req: Request, res: Response) => {
  const { title, hours, startDate, endDate, trainees, driveFolderId, spreadsheetId, appsScriptUrl } = req.body;
  if (!title) {
    return res.status(400).json({ error: '직무연수명을 입력해주세요.' });
  }

  const newTraining: TrainingRecord = {
    id: 'TR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title: String(title).trim(),
    hours: hours || 0,
    startDate: startDate || '',
    endDate: endDate || '',
    trainees: Array.isArray(trainees) ? trainees : [],
    driveFolderId: (driveFolderId || '').trim(),
    spreadsheetId: (spreadsheetId || '').trim(),
    appsScriptUrl: (appsScriptUrl || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.trainings.unshift(newTraining);
  saveDatabase();
  broadcastEvent('training:updated', { action: 'create', training: newTraining });

  res.status(201).json(newTraining);
});

app.get('/api/trainings/:id', (req: Request, res: Response) => {
  const training = db.trainings.find(t => t.id === req.params.id);
  if (!training) {
    return res.status(404).json({ error: '직무연수를 찾을 수 없습니다.' });
  }
  res.json(training);
});

app.put('/api/trainings/:id', (req: Request, res: Response) => {
  const index = db.trainings.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '직무연수를 찾을 수 없습니다.' });
  }

  const { title, hours, startDate, endDate, trainees, driveFolderId, spreadsheetId, appsScriptUrl } = req.body;
  const existing = db.trainings[index];

  const updated: TrainingRecord = {
    ...existing,
    title: title ? String(title).trim() : existing.title,
    hours: hours !== undefined ? hours : existing.hours,
    startDate: startDate !== undefined ? startDate : existing.startDate,
    endDate: endDate !== undefined ? endDate : existing.endDate,
    trainees: Array.isArray(trainees) ? trainees : existing.trainees,
    driveFolderId: driveFolderId !== undefined ? String(driveFolderId).trim() : existing.driveFolderId,
    spreadsheetId: spreadsheetId !== undefined ? String(spreadsheetId).trim() : existing.spreadsheetId,
    appsScriptUrl: appsScriptUrl !== undefined ? String(appsScriptUrl).trim() : existing.appsScriptUrl,
    updatedAt: new Date().toISOString(),
  };

  db.trainings[index] = updated;
  saveDatabase();
  broadcastEvent('training:updated', { action: 'update', training: updated });

  res.json(updated);
});

app.delete('/api/trainings/:id', (req: Request, res: Response) => {
  const trainingId = req.params.id;
  const initialLength = db.trainings.length;
  db.trainings = db.trainings.filter(t => t.id !== trainingId);

  if (db.trainings.length === initialLength) {
    return res.status(404).json({ error: '직무연수를 찾을 수 없습니다.' });
  }

  // Remove corresponding submissions & files
  const deletedSubmissions = db.submissions.filter(s => s.trainingId === trainingId);
  db.submissions = db.submissions.filter(s => s.trainingId !== trainingId);
  for (const sub of deletedSubmissions) {
    const filePath = path.resolve(UPLOADS_DIR, `${sub.id}.pdf`);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  saveDatabase();
  broadcastEvent('training:updated', { action: 'delete', trainingId });
  res.json({ success: true });
});

// Submissions API
app.get('/api/trainings/:id/submissions', (req: Request, res: Response) => {
  const trainingId = req.params.id;
  const subs = db.submissions.filter(s => s.trainingId === trainingId);
  res.json(subs);
});

// Helper: Sync directly to Google Drive and Sheets using Google OAuth Token
async function uploadToGoogleDriveAndSheets(
  token: string,
  folderId: string,
  spreadsheetId: string,
  trainingTitle: string,
  traineeName: string,
  certNumber: string,
  pdfBuffer: Buffer,
  submissionId: string,
  submittedAt: string
): Promise<{ driveFileId?: string; driveFileUrl?: string; sheetSynced: boolean }> {
  let driveFileId: string | undefined;
  let driveFileUrl: string | undefined;
  let sheetSynced = false;

  // 1. Upload to Google Drive if folderId is provided
  if (folderId && token) {
    try {
      const safeTitle = trainingTitle.replace(/[\/\\:*?"<>|]/g, '_');
      const safeName = traineeName.replace(/[\/\\:*?"<>|]/g, '_');
      const safeCert = certNumber.replace(/[\/\\:*?"<>|]/g, '_');
      const fileName = `[${safeTitle}] ${safeName}_${safeCert}_이수증.pdf`;

      const metadata = {
        name: fileName,
        parents: [folderId],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody = Buffer.concat([
        Buffer.from(
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/pdf\r\n\r\n'
        ),
        pdfBuffer,
        Buffer.from(closeDelimiter),
      ]);

      const driveRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );

      if (driveRes.ok) {
        const driveData = await driveRes.json();
        driveFileId = driveData.id;
        driveFileUrl = driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view`;
      } else {
        const errText = await driveRes.text();
        console.warn('Google Drive direct upload failed:', errText);
      }
    } catch (err) {
      console.error('Error uploading to Google Drive:', err);
    }
  }

  // 2. Append row to Google Sheets if spreadsheetId is provided
  if (spreadsheetId && token) {
    try {
      // Dynamic sheet title resolution (prevent 'Sheet1' error in Korean '시트1' environment)
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const sheets = metaData.sheets || [];
        const firstSheetTitle = sheets[0]?.properties?.title || '시트1';

        // Check if header row exists
        const headerCheckRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(firstSheetTitle)}'!A1:G1`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const headerData = await headerCheckRes.json();
        if (!headerData.values || headerData.values.length === 0) {
          // Append headers first
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(firstSheetTitle)}'!A1:G1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: [
                  ['이수번호', '이수명', '이수자 이름', '이수일시', '이수증 링크', '제출구분', '제출 ID'],
                ],
              }),
            }
          );
        }

        // Append submission row
        const rowData = [
          certNumber,
          trainingTitle,
          traineeName,
          submittedAt,
          driveFileUrl || '파일 저장 대기',
          '온라인 무로그인 제출',
          submissionId,
        ];

        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(firstSheetTitle)}'!A:G:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowData],
            }),
          }
        );

        if (appendRes.ok) {
          sheetSynced = true;
        } else {
          console.warn('Sheets append failed:', await appendRes.text());
        }
      }
    } catch (err) {
      console.error('Error appending to Google Sheet:', err);
    }
  }

  return { driveFileId, driveFileUrl, sheetSynced };
}

// 100% NO-LOGIN SUBMISSION ENDPOINT FOR TEACHERS/USERS
app.post('/api/trainings/:id/submit', async (req: Request, res: Response) => {
  const trainingId = req.params.id;
  const training = db.trainings.find(t => t.id === trainingId);
  if (!training) {
    return res.status(404).json({ error: '해당 직무연수가 존재하지 않습니다.' });
  }

  const { traineeName, traineeNormalized, certNumber, pdfBase64, pdfFileName } = req.body;

  if (!traineeName || !traineeName.trim()) {
    return res.status(400).json({ error: '이수자 성명을 선택해주세요.' });
  }
  if (!certNumber || !certNumber.trim()) {
    return res.status(400).json({ error: '이수번호를 입력해주세요.' });
  }
  if (!pdfBase64) {
    return res.status(400).json({ error: '이수증 PDF 파일을 첨부해주세요.' });
  }

  const submissionId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const submittedAt = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Decode PDF buffer
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
  const pdfBuffer = Buffer.from(cleanBase64, 'base64');
  const pdfFileSize = pdfBuffer.length;

  // Save to local filesystem
  const localFilePath = path.resolve(UPLOADS_DIR, `${submissionId}.pdf`);
  fs.writeFileSync(localFilePath, pdfBuffer);

  let driveFileId: string | undefined;
  let driveFileUrl: string | undefined;
  let sheetSynced = false;

  // 1) Primary Integration: Google Apps Script Web App (if configured)
  if (training.appsScriptUrl) {
    try {
      const response = await fetch(training.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          folderId: training.driveFolderId,
          spreadsheetId: training.spreadsheetId,
          trainingTitle: training.title,
          traineeName,
          certNumber,
          pdfBase64: cleanBase64,
          pdfFileName: pdfFileName || `${training.title}_${traineeName}_이수증.pdf`,
          submissionId,
          submittedAt,
        }),
      });

      if (response.ok) {
        const result: any = await response.json();
        if (result.success) {
          driveFileId = result.driveFileId;
          driveFileUrl = result.driveFileUrl;
          sheetSynced = true;
        }
      }
    } catch (appsErr) {
      console.warn('Apps Script integration attempt failed, falling back to local/OAuth:', appsErr);
    }
  }

  // 2) Secondary Integration: Admin In-Memory Google OAuth Token (if Apps Script didn't handle it)
  if (!sheetSynced && inMemoryAdminToken && (training.driveFolderId || training.spreadsheetId)) {
    try {
      const googleSync = await uploadToGoogleDriveAndSheets(
        inMemoryAdminToken,
        training.driveFolderId,
        training.spreadsheetId,
        training.title,
        traineeName,
        certNumber,
        pdfBuffer,
        submissionId,
        submittedAt
      );
      if (googleSync.driveFileUrl) driveFileUrl = googleSync.driveFileUrl;
      if (googleSync.driveFileId) driveFileId = googleSync.driveFileId;
      if (googleSync.sheetSynced) sheetSynced = true;
    } catch (tokenErr) {
      console.warn('Direct OAuth sync failed:', tokenErr);
    }
  }

  const newSubmission: SubmissionRecord = {
    id: submissionId,
    trainingId,
    traineeName: traineeName.trim(),
    traineeNormalized: (traineeNormalized || traineeName).trim(),
    certNumber: certNumber.trim(),
    submittedAt,
    pdfFileName: pdfFileName || `${training.title}_${traineeName}_이수증.pdf`,
    pdfFileSize,
    driveFileId,
    driveFileUrl,
    sheetSynced,
  };

  // Upsert if same trainee already submitted
  const existingIdx = db.submissions.findIndex(
    s => s.trainingId === trainingId && s.traineeNormalized === newSubmission.traineeNormalized
  );
  if (existingIdx !== -1) {
    db.submissions[existingIdx] = newSubmission;
  } else {
    db.submissions.unshift(newSubmission);
  }

  saveDatabase();

  // Instant Real-time SSE Broadcast to all connected admin screens
  broadcastEvent('submission:new', {
    submission: newSubmission,
    trainingTitle: training.title,
  });

  res.status(201).json({
    success: true,
    submission: newSubmission,
  });
});

// Admin delete submission
app.delete('/api/submissions/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const sub = db.submissions.find(s => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: '제출 내역을 찾을 수 없습니다.' });
  }

  db.submissions = db.submissions.filter(s => s.id !== id);
  const filePath = path.resolve(UPLOADS_DIR, `${id}.pdf`);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  saveDatabase();
  broadcastEvent('submission:deleted', { id, trainingId: sub.trainingId });
  res.json({ success: true });
});

// View/Download submitted PDF file
app.get('/api/submissions/:id/file', (req: Request, res: Response) => {
  const id = req.params.id;
  const sub = db.submissions.find(s => s.id === id);
  const filePath = path.resolve(UPLOADS_DIR, `${id}.pdf`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('PDF 파일을 찾을 수 없습니다.');
  }

  const safeFilename = encodeURIComponent(sub ? sub.pdfFileName : `certificate-${id}.pdf`);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${safeFilename}`);
  fs.createReadStream(filePath).pipe(res);
});

// Test Google Drive Folder Connection
app.post('/api/test/google-drive', async (req: Request, res: Response) => {
  const { folderId, token } = req.body;
  const authToken = token || inMemoryAdminToken;
  if (!authToken) {
    return res.status(401).json({ error: 'Google 관리자 계정 로그인이 필요합니다.' });
  }
  if (!folderId) {
    return res.status(400).json({ error: '구글 드라이브 폴더 ID 또는 URL을 입력해주세요.' });
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,capabilities`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!driveRes.ok) {
      const err = await driveRes.json();
      return res.status(driveRes.status).json({
        error: `드라이브 폴더 조회 실패: ${err.error?.message || '권한 또는 폴더 ID를 확인해주세요.'}`,
      });
    }

    const data = await driveRes.json();
    if (data.mimeType !== 'application/vnd.google-apps.folder') {
      return res.status(400).json({ error: `지정한 ID는 폴더가 아닌 파일입니다: ${data.name}` });
    }

    res.json({
      success: true,
      folderId: data.id,
      folderName: data.name,
      canAddChildren: data.capabilities?.canAddChildren !== false,
    });
  } catch (err: any) {
    res.status(500).json({ error: `드라이브 연결 오류: ${err.message}` });
  }
});

// Test Google Sheets Connection & Retrieve Dynamic Tab Names
app.post('/api/test/google-sheets', async (req: Request, res: Response) => {
  const { spreadsheetId, token } = req.body;
  const authToken = token || inMemoryAdminToken;
  if (!authToken) {
    return res.status(401).json({ error: 'Google 관리자 계정 로그인이 필요합니다.' });
  }
  if (!spreadsheetId) {
    return res.status(400).json({ error: '구글 스프레드시트 ID 또는 URL을 입력해주세요.' });
  }

  try {
    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!sheetsRes.ok) {
      const err = await sheetsRes.json();
      return res.status(sheetsRes.status).json({
        error: `스프레드시트 조회 실패: ${err.error?.message || '권한 또는 시트 ID를 확인해주세요.'}`,
      });
    }

    const data = await sheetsRes.json();
    const sheetTabs = (data.sheets || []).map((s: any) => s.properties.title);

    res.json({
      success: true,
      spreadsheetId,
      spreadsheetTitle: data.properties?.title || '스프레드시트',
      sheets: sheetTabs,
      firstTab: sheetTabs[0] || '시트1',
    });
  } catch (err: any) {
    res.status(500).json({ error: `스프레드시트 연결 오류: ${err.message}` });
  }
});

// Test Apps Script Web App Connection
app.post('/api/test/apps-script', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Apps Script 웹 앱 URL을 입력해주세요.' });
  }

  try {
    const testRes = await fetch(url, { method: 'GET' });
    if (!testRes.ok) {
      return res.status(testRes.status).json({
        error: `Apps Script 웹 앱 응답 오류 (HTTP ${testRes.status}). 배포 설정을 확인해주세요.`,
      });
    }

    const data: any = await testRes.json();
    res.json({
      success: true,
      message: data.message || 'Apps Script가 정상적으로 응답했습니다.',
    });
  } catch (err: any) {
    res.status(500).json({
      error: `Apps Script 연결 실패: ${err.message}. 웹 앱의 [액세스 권한]이 '모든 사용자'로 배포되었는지 확인하세요.`,
    });
  }
});

// Admin Sync Action: Sync unsynced submissions to Google Sheets & Drive
app.post('/api/sync/sheets', async (req: Request, res: Response) => {
  const { trainingId, token } = req.body;
  const authToken = token || inMemoryAdminToken;

  const training = db.trainings.find(t => t.id === trainingId);
  if (!training) {
    return res.status(404).json({ error: '직무연수를 찾을 수 없습니다.' });
  }

  const submissions = db.submissions.filter(s => s.trainingId === trainingId);
  let syncedCount = 0;

  for (const sub of submissions) {
    // If not synced to sheet or drive
    if (!sub.sheetSynced && authToken && training.spreadsheetId) {
      const filePath = path.resolve(UPLOADS_DIR, `${sub.id}.pdf`);
      let pdfBuffer = Buffer.alloc(0);
      if (fs.existsSync(filePath)) {
        pdfBuffer = fs.readFileSync(filePath);
      }

      const syncResult = await uploadToGoogleDriveAndSheets(
        authToken,
        training.driveFolderId,
        training.spreadsheetId,
        training.title,
        sub.traineeName,
        sub.certNumber,
        pdfBuffer,
        sub.id,
        sub.submittedAt
      );

      if (syncResult.sheetSynced) {
        sub.sheetSynced = true;
        if (syncResult.driveFileUrl) sub.driveFileUrl = syncResult.driveFileUrl;
        if (syncResult.driveFileId) sub.driveFileId = syncResult.driveFileId;
        syncedCount++;
      }
    }
  }

  if (syncedCount > 0) {
    saveDatabase();
    broadcastEvent('sync:complete', { trainingId, syncedCount });
  }

  res.json({
    success: true,
    total: submissions.length,
    syncedCount,
  });
});

// Mount Vite or serve static production build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
