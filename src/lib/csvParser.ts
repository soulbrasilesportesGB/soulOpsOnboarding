import Papa from 'papaparse';
import { norm } from './utils';

export interface CSVRow {
  [key: string]: string;
}

/**
 * Parse CSV text into structured data
 * Handles BOM, newlines in quoted fields, and normalizes headers
 */
export const parseCSVText = (text: string): CSVRow[] => {
  const result = Papa.parse<Record<string, string | null>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => (h || '').replace(/^\uFEFF/, '').trim(),
  });

  if (result.errors?.length) {
    console.warn('CSV parse errors:', result.errors.slice(0, 5));
  }

  return (result.data || []).map((row) => {
    const clean: CSVRow = {};
    for (const [k, v] of Object.entries(row || {})) {
      clean[k] = v === null || v === undefined ? '' : String(v).trim();
    }
    return clean;
  });
};

/**
 * Count rows by a specific field (e.g., athlete_id)
 */
export const countByField = (rows: CSVRow[], fieldName: string): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const id = (row[fieldName] || '').toString().trim();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
};

/**
 * Build a map of athlete_id -> Set<activation_type_id>
 */
export const buildActivationTypeSetByAthleteId = (rows: CSVRow[]): Record<string, Set<string>> => {
  const map: Record<string, Set<string>> = {};
  for (const row of rows) {
    const athleteId = String(row.athlete_id || '').trim();
    if (!athleteId) continue;

    const typeId = String(
      row.activation_type_id || row.type_id || row.ativacao_id || row.activation_id || ''
    ).trim();
    if (!typeId) continue;

    if (!map[athleteId]) map[athleteId] = new Set<string>();
    map[athleteId].add(typeId);
  }
  return map;
};

/**
 * Extract a CSV field from a potential JSON array string
 * e.g., "['field1','field2']" or "field1" or "['field1']"
 */
export const extractArrayField = (value: string | null | undefined): string[] => {
  if (!value) return [];

  const cleaned = norm(value);
  if (!cleaned) return [];

  // Try to parse as JSON array
  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter((s) => s.length > 0);
      }
    } catch {
      // not valid JSON array
    }
  }

  // Otherwise treat as single value
  return [cleaned];
};

/**
 * Normalize and deduplicate array of values
 */
export const normalizeArray = (arr: (string | null | undefined)[]): string[] => {
  return [...new Set(
    arr
      .map((item) => String(item || '').trim())
      .filter((s) => s.length > 0)
  )];
};
