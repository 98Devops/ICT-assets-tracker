import Papa from 'papaparse';
import { assetSchema, type AssetFormValues } from '@/features/assets/api';
import { ASSET_CATEGORIES, ASSET_STATUSES, type AssetCategory, type AssetStatus } from '@/lib/types';

/** Target fields an import column can map to. */
export const IMPORT_FIELDS = [
  'asset_tag', 'name', 'category', 'serial_number', 'model', 'purchase_date',
  'cost', 'warranty_expiry', 'status', 'condition', 'location', 'notes',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  asset_tag: ['tag', 'asset tag', 'asset no', 'asset number', 'code', 'asset code', 'id'],
  name: ['name', 'asset name', 'description', 'item', 'equipment'],
  category: ['category', 'type', 'asset type', 'class'],
  serial_number: ['serial', 'serial number', 'serial no', 's/n', 'sn'],
  model: ['model', 'model number', 'make/model', 'make'],
  purchase_date: ['purchase date', 'date purchased', 'bought', 'acquisition date', 'date'],
  cost: ['cost', 'price', 'value', 'amount', 'purchase price', 'usd'],
  warranty_expiry: ['warranty', 'warranty expiry', 'warranty end', 'guarantee'],
  status: ['status', 'state', 'condition status'],
  condition: ['condition', 'physical condition'],
  location: ['location', 'room', 'office', 'site', 'place'],
  notes: ['notes', 'comments', 'remarks', 'details'],
};

/** Suggest a target field for a CSV header, or null. */
export function autoMapHeader(header: string): ImportField | null {
  const h = header.trim().toLowerCase();
  for (const field of IMPORT_FIELDS) {
    if (h === field || h === field.replace('_', ' ')) return field;
    if (HEADER_SYNONYMS[field].includes(h)) return field;
  }
  return null;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter(Boolean);
        if (headers.length === 0) reject(new Error('No header row found in the file.'));
        else resolve({ headers, rows: res.data });
      },
      error: () => reject(new Error('Could not read the file. Save it as CSV and try again.')),
    });
  });
}

const CATEGORY_ALIASES: Record<string, AssetCategory> = {
  computer: 'desktop', pc: 'desktop', 'desktop computer': 'desktop',
  notebook: 'laptop', 'laptop computer': 'laptop',
  whiteboard: 'interactive_screen', 'smart board': 'interactive_screen', 'interactive screen': 'interactive_screen',
  'access point': 'router', wifi: 'router', ap: 'router',
  camera: 'cctv', 'cctv camera': 'cctv', dvr: 'cctv',
  biometric: 'access_control', 'access control': 'access_control',
  software: 'software_license', licence: 'software_license', license: 'software_license', 'software license': 'software_license',
};

function normalizeCategory(v: string): AssetCategory {
  const s = v.trim().toLowerCase().replace(/[-_]/g, ' ');
  const direct = ASSET_CATEGORIES.find((c) => c === s.replace(/ /g, '_'));
  if (direct) return direct;
  return CATEGORY_ALIASES[s] ?? 'other';
}

function normalizeStatus(v: string): AssetStatus {
  const s = v.trim().toLowerCase().replace(/[-_ ]/g, '_');
  const direct = ASSET_STATUSES.find((c) => c === s);
  if (direct) return direct;
  if (/repair/.test(s)) return 'in_repair';
  if (/broken|fault|damag/.test(s)) return 'faulty';
  if (/miss|stolen|lost/.test(s)) return 'lost';
  if (/retir|dispos|scrap|written/.test(s)) return 'retired';
  return 'active';
}

/** Accepts dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy; returns ISO date or ''. */
export function normalizeDate(v: string): string {
  const s = v.trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

export interface RowResult {
  index: number;
  values: AssetFormValues | null;
  errors: string[];
  raw: Record<string, string>;
}

/** Convert mapped CSV rows to validated asset values. `mapping` = csvHeader → field. */
export function validateRows(
  rows: Record<string, string>[],
  mapping: Record<string, ImportField | ''>,
  nextTagStart: number,
): { results: RowResult[]; validCount: number } {
  let tagCounter = nextTagStart;
  const seenTags = new Set<string>();
  const results = rows.map((raw, index) => {
    const get = (field: ImportField): string => {
      const header = Object.keys(mapping).find((h) => mapping[h] === field);
      return header ? (raw[header] ?? '').trim() : '';
    };
    const tag = get('asset_tag') || `ICT-${String(tagCounter++).padStart(4, '0')}`;
    const candidate = {
      asset_tag: tag,
      name: get('name'),
      category: normalizeCategory(get('category')),
      serial_number: get('serial_number'),
      model: get('model'),
      supplier_id: null,
      purchase_date: normalizeDate(get('purchase_date')),
      cost: get('cost') ? Number(get('cost').replace(/[^0-9.]/g, '')) : null,
      warranty_expiry: normalizeDate(get('warranty_expiry')),
      status: normalizeStatus(get('status')),
      condition: get('condition'),
      location: get('location'),
      department_id: null,
      notes: get('notes'),
    };
    const parsed = assetSchema.safeParse(candidate);
    const errors: string[] = [];
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
    if (candidate.cost !== null && Number.isNaN(candidate.cost)) errors.push('cost: not a number');
    if (seenTags.has(tag)) errors.push(`asset_tag: duplicate tag "${tag}" in file`);
    seenTags.add(tag);
    return { index, values: errors.length === 0 && parsed.success ? parsed.data : null, errors, raw };
  });
  return { results, validCount: results.filter((r) => r.values).length };
}
