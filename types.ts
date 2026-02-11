export type TagStatus = 'draft' | 'active' | 'review' | 'approved' | 'archived';

export type BlockType = 'text' | 'number' | 'separator' | 'dictionary' | 'parent' | 'placeholder';

export interface User {
  id: string;
  name: string;
  role: string; // e.g., "Senior Engineer"
  email: string;
}

export interface AuditLog {
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

export interface DictionaryItem {
  id: string;
  category: string;
  subCategory?: string;
  code: string;
  value: string;
  description?: string;
}

export interface TemplateBlock {
  id: string;
  type: BlockType;
  value?: string; // For text/separator
  categoryId?: string; // For dictionary
  subCategoryId?: string; // For dictionary
  isAutoIncrement?: boolean; // For number
  isSuffix?: boolean; // For text (enables A, B, C iteration)
  padding?: number; // For number (e.g., 3 for 001)
  separator?: string; // specific separator char
}

export interface Template {
  id: string;
  name: string;
  description: string;
  blocks: TemplateBlock[];
  createdAt: string;
}

export interface Tag {
  id: string;
  fullTag: string;
  parts: { [blockId: string]: string }; // Stores the resolved value for each block
  templateId: string;
  status: TagStatus;
  parentId?: string; // For hierarchy
  notes?: string;
  history: AuditLog[];
  createdAt: string;
}

export interface ReservedRange {
  id: string;
  start: number;
  end: number;
  prefix?: string; // Optional: Apply only to specific prefixes
  reason: string;
}

export interface AppState {
  currentUser: User | null;
  tags: Tag[];
  templates: Template[];
  dictionaries: DictionaryItem[];
  reservedRanges: ReservedRange[];
  // Optimization: Track last used number for each prefix (Prefix -> LastNumber)
  counters: Record<string, number>;
}