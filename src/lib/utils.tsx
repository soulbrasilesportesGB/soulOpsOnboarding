import type { ReactNode } from 'react';
import {
  CheckCircle,
  TrendingUp,
  Clock,
  Users,
} from 'lucide-react';
import type { CompletionStatus } from '../types/common';

// Status color mappings for background/border
export const STATUS_COLORS: Record<CompletionStatus | string, string> = {
  complete: 'bg-green-50 border-green-200',
  acceptable: 'bg-indigo-50 border-indigo-200',
  almost: 'bg-blue-50 border-blue-200',
  incomplete: 'bg-yellow-50 border-yellow-200',
  stalled: 'bg-red-50 border-red-200',
};

// Status badge colors (text + background)
export const STATUS_BADGE_COLORS: Record<CompletionStatus | string, string> = {
  complete: 'bg-green-100 text-green-800',
  acceptable: 'bg-indigo-100 text-indigo-800',
  almost: 'bg-blue-100 text-blue-800',
  incomplete: 'bg-yellow-100 text-yellow-800',
  stalled: 'bg-red-100 text-red-800',
};

// Get icon component for status (returns React component)
export const getStatusIcon = (status: string): ReactNode => {
  const iconProps = { size: 24 };
  
  switch (status) {
    case 'complete':
      return <CheckCircle className="text-green-600" {...iconProps} />;
    case 'acceptable':
      return <CheckCircle className="text-indigo-600" {...iconProps} />;
    case 'almost':
      return <TrendingUp className="text-blue-600" {...iconProps} />;
    case 'incomplete':
      return <Clock className="text-yellow-600" {...iconProps} />;
    case 'stalled':
      return <Users className="text-red-600" {...iconProps} />;
    default:
      return <Users className="text-gray-600" {...iconProps} />;
  }
};

// Get icon component class (for string-based icon detection)
export const getStatusIconClass = (status: string): string => {
  switch (status) {
    case 'complete':
      return 'text-green-600';
    case 'acceptable':
      return 'text-indigo-600';
    case 'almost':
      return 'text-blue-600';
    case 'incomplete':
      return 'text-yellow-600';
    case 'stalled':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

// Normalize missing fields from various formats
export const normalizeMissingFields = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch (_) {
      // not valid JSON, return empty
    }
  }
  return [];
};

// Helper to check if value is filled
export const isFilled = (v: unknown): boolean =>
  v !== null &&
  v !== undefined &&
  String(v).trim() !== '' &&
  String(v).trim().toLowerCase() !== 'null';

// Helper to check if value is empty (for arrays/objects)
export const isEmptyArrayLike = (v: unknown): boolean => {
  if (v == null) return true;
  const s = String(v).trim();
  return s === '' || s === '[]' || s === '{}' || s === 'null';
};

// Normalize string values (trim, remove quotes, BOM)
export const norm = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v).replace(/^\uFEFF/, '').trim().replace(/^"|"$/g, '');
};

// Pick first non-empty value from object keys
export const pick = (obj: Record<string, unknown>, keys: string[]): string => {
  for (const k of keys) {
    const val = norm(obj?.[k]);
    if (val && val.toLowerCase() !== 'null') return val;
  }
  return '';
};

// Check if object has any value in given keys
export const hasValue = (obj: Record<string, unknown>, keys: string[]): boolean =>
  pick(obj, keys) !== '';

// Format date to YYYY-MM-DD
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// Capitalize first letter
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);
