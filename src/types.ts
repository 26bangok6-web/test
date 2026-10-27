export interface Training {
  id: string;
  title: string;
  hours: number | string;
  startDate: string;
  endDate: string;
  trainees: string[]; // e.g. ["홍길동 (교무부)", "김철수 (연구부)"]
  driveFolderId: string;
  spreadsheetId: string;
  appsScriptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  trainingId: string;
  traineeName: string; // The selected raw name from roster
  traineeNormalized: string;
  certNumber: string;
  submittedAt: string;
  pdfFileName: string;
  pdfFileSize: number;
  driveFileId?: string;
  driveFileUrl?: string;
  sheetSynced?: boolean;
}

export interface RosterStatus {
  rawName: string;
  normalizedName: string;
  isSubmitted: boolean;
  submission?: Submission;
}

export interface TrainingStats {
  total: number;
  submitted: number;
  pending: number;
  rate: number;
}

export interface SSEMessage {
  type: 'submission:new' | 'submission:deleted' | 'training:updated' | 'sync:complete';
  payload: any;
  timestamp: string;
}
