/**
 * Utility to extract clean Google Drive Folder IDs and Google Spreadsheet IDs from URLs or raw strings.
 */

export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Pattern: https://drive.google.com/drive/folders/ID or /drive/u/0/folders/ID
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Pattern: id query param e.g. ?id=1ABC...
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }

  // If already an ID (alphanumeric, underscores, hyphens, typically 15+ characters)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export function extractSheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Pattern: https://docs.google.com/spreadsheets/d/ID/edit
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If already an ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}
