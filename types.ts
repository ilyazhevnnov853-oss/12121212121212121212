export type TagStatus = 'draft' | 'active' | 'review' | 'approved' | 'archived';

export type BlockType = 'text' | 'number' | 'separator' | 'dictionary' | 'parent' | 'placeholder' | 'global_var' | 'parent_ref';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user' | string; // Updated type
  email: string;
  password?: string; // For mock auth
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

export interface DictionaryItem {
  id: string;
  projectId: string; // Linked to project
  category: string;
  subCategory?: string;
  code: string;
  value: string;
  description?: string;
}

export interface GlobalVariable {
  id: string;
  projectId: string; // Linked to project
  key: string; 
  value: string; 
  description?: string;
}

export interface TemplateBlock {
  id: string;
  type: BlockType;
  value?: string; 
  categoryId?: string; 
  subCategoryId?: string; 
  isAutoIncrement?: boolean; 
  isSuffix?: boolean; 
  padding?: number; 
  separator?: string; 
  variableKey?: string; 
  parentSource?: 'number' | 'wbs' | 'full_tag'; 
}

export interface Template {
  id: string;
  projectId: string; // Linked to project
  name: string;
  description: string;
  blocks: TemplateBlock[];
  createdAt: string;
}

export interface Tag {
  id: string;
  projectId: string; // Linked to project
  fullTag: string;
  parts: { [blockId: string]: string }; 
  templateId: string;
  status: TagStatus;
  parentId?: string; 
  notes?: string;
  history: AuditLog[];
  createdAt: string;
}

export interface ReservedRange {
  id: string;
  projectId: string; // Linked to project
  scope: string; // Prefix (e.g., "P", "V", "HV-101") to isolate counters
  start: number;
  end: number;
  reason: string;
}

export interface AppState {
  currentUser: User | null;
  currentProjectId: string | null;
  projects: Project[];
  tags: Tag[];
  templates: Template[];
  dictionaries: DictionaryItem[];
  reservedRanges: ReservedRange[];
  globalVariables: GlobalVariable[];
  // Key format: `${projectId}_${prefix}`
  counters: Record<string, number>;
}