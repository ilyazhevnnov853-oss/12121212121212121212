
export type TagStatus = 'draft' | 'active' | 'review' | 'approved' | 'archived' | 'reserved';

export type BlockType = 'text' | 'number' | 'separator' | 'dictionary' | 'parent' | 'placeholder' | 'global_var' | 'parent_ref';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user' | string; 
  email: string;
  password?: string; 
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
  projectId: string; 
  category: string;
  subCategory?: string;
  code: string;
  value: string;
  description?: string;
}

export interface GlobalVariable {
  id: string;
  projectId: string; 
  key: string; 
  value: string; 
  description?: string;
}

export interface TemplateBlock {
  id: string;
  type: BlockType;
  value?: string; 
  categoryId?: string; // In Global Mode, this is the "Abstract Name" (e.g., "Fluid Type")
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
  projectId: string; 
  name: string;
  description: string;
  blocks: TemplateBlock[];
  createdAt: string;
}

export interface Tag {
  id: string;
  projectId: string; 
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
  projectId: string; 
  scope: string; 
  start: number;
  end: number;
  reason: string;
}

// --- LIBRARY TYPES (TEMPLATES) ---

export type LibraryItemType = 'template' | 'assembly';

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  name: string;
  description: string;
  category: string; // e.g., "Mechanical", "Electrical"
  createdAt: string;
  createdBy: string;
}

export interface LibraryTemplate extends LibraryItem {
  type: 'template';
  blocks: TemplateBlock[];
}

// --- LIBRARY TYPES (ASSEMBLIES) ---

export interface AbstractComponent {
  id: string;
  name: string; // Role Name (e.g. "Supply Fan Motor")
  defaultPrefix: string; // e.g. "M" or "TE"
  description?: string;
  children?: AbstractComponent[];
}

export interface AbstractAssembly extends LibraryItem {
  type: 'assembly';
  rootComponent: AbstractComponent;
}

// --- APP STATE ---

export interface AppState {
  currentUser: User | null;
  currentProjectId: string | null;
  projects: Project[];
  tags: Tag[];
  templates: Template[];
  dictionaries: DictionaryItem[];
  reservedRanges: ReservedRange[];
  globalVariables: GlobalVariable[];
  counters: Record<string, number>;
  
  // New Global Library State
  globalLibrary: LibraryTemplate[];
  globalAssemblies: AbstractAssembly[];
}
