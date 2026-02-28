import type { Session } from '@supabase/supabase-js';

// Views
export type View = 'import' | 'dashboard' | 'list' | 'detail';

// Status and Messages
export type StatusType = 'success' | 'error' | null;
export type CompletionStatus = 'stalled' | 'incomplete' | 'almost' | 'acceptable' | 'complete';

// Auth Context
export type AuthState = {
  session: Session | null;
  loading: boolean;
};

// Message
export type Message = {
  type: StatusType;
  text: string;
};
