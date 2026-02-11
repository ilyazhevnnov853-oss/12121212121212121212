import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AppState, Tag, Template, DictionaryItem, ReservedRange, TagStatus, User, GlobalVariable, Project } from './types';

// --- SEED DATA (Default Project) ---
const DEFAULT_PROJECT_ID = 'proj_pdh2';

const SEED_PROJECTS: Project[] = [
    { id: DEFAULT_PROJECT_ID, name: 'PDH2 Construction', description: 'Propane Dehydrogenation Unit 2', createdAt: new Date().toISOString(), createdBy: 'System' },
    { id: 'proj_demo', name: 'Demo Plant A', description: 'Test environment', createdAt: new Date().toISOString(), createdBy: 'System' }
];

const SEED_DICTIONARIES: DictionaryItem[] = [
  { id: 'w1', projectId: DEFAULT_PROJECT_ID, category: 'WBS/Система', code: '210', value: 'Дегидрирование пропана', description: 'Propane Dehydrogenation' },
  { id: 'w2', projectId: DEFAULT_PROJECT_ID, category: 'WBS/Система', code: '213', value: 'Фракционирование', description: 'Fractionation' },
  { id: 'w3', projectId: DEFAULT_PROJECT_ID, category: 'WBS/Система', code: '320', value: 'Общезаводское хозяйство', description: 'Utilities' },
  { id: 'e1', projectId: DEFAULT_PROJECT_ID, category: 'Тип Оборудования', code: 'P', value: 'Насос', description: 'Centrifugal/Reciprocating Pump' },
  { id: 'e2', projectId: DEFAULT_PROJECT_ID, category: 'Тип Оборудования', code: 'V', value: 'Емкость/Сосуд', description: 'Vessel/Drum' },
  { id: 'v1', projectId: DEFAULT_PROJECT_ID, category: 'Тип Арматуры', code: 'HV', value: 'Ручной клапан', description: 'Hand Valve' },
  { id: 'v2', projectId: DEFAULT_PROJECT_ID, category: 'Тип Арматуры', code: 'MOV', value: 'Клапан с электроприводом', description: 'Motor Operated Valve' },
];

const SEED_GLOBAL_VARS: GlobalVariable[] = [
    { id: 'gv1', projectId: DEFAULT_PROJECT_ID, key: 'MOTOR_PREFIX', value: 'M', description: 'Префикс электродвигателей' },
    { id: 'gv2', projectId: DEFAULT_PROJECT_ID, key: 'SEPARATOR', value: '-', description: 'Стандартный разделитель' },
    { id: 'gv3', projectId: DEFAULT_PROJECT_ID, key: 'HEATER_SUFFIX', value: 'EH', description: 'Суффикс электронагревателей' }
];

const SEED_TEMPLATES: Template[] = [
  {
    id: 't_mech',
    projectId: DEFAULT_PROJECT_ID,
    name: 'Механическое оборудование (P/V/E)',
    description: 'PDH2 Структура: [Тип]-[WBS][Номер][Суффикс]. Пример: P-21301A',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'b1', type: 'dictionary', categoryId: 'Тип Оборудования' },
      { id: 'b2', type: 'separator', value: '-' },
      { id: 'b3', type: 'dictionary', categoryId: 'WBS/Система' },
      { id: 'b4', type: 'number', isAutoIncrement: true, padding: 2 }, 
      { id: 'b5', type: 'text', value: '', isSuffix: true }, 
    ],
  },
  {
    id: 't_motor_smart',
    projectId: DEFAULT_PROJECT_ID,
    name: 'Эл. двигатель (Умная привязка)',
    description: 'Автоматически берет WBS и Номер от родителя (насоса). Пример: P-21301 -> M-21301',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'm1', type: 'global_var', variableKey: 'MOTOR_PREFIX' }, 
      { id: 'm2', type: 'separator', value: '-' },
      { id: 'm3', type: 'parent_ref', parentSource: 'wbs' }, 
      { id: 'm4', type: 'parent_ref', parentSource: 'number' }, 
      { id: 'm5', type: 'text', value: '', isSuffix: true }, 
    ],
  }
];

const SEED_TAGS: Tag[] = [
  {
    id: 'tag_demo_1',
    projectId: DEFAULT_PROJECT_ID,
    fullTag: 'P-21301',
    parts: { b1: 'P', b3: '213', b4: '01', b5: '' },
    templateId: 't_mech',
    status: 'active',
    createdAt: new Date().toISOString(),
    history: [{ action: 'Создан', timestamp: new Date().toISOString(), user: 'System' }],
  }
];

const SEED_COUNTERS = {
    [`${DEFAULT_PROJECT_ID}_P-213`]: 1
};

// --- Context Definition ---

interface StoreContextType extends AppState {
  // Auth
  login: (user: Partial<User>, rememberMe: boolean) => void;
  logout: () => void;
  
  // Project Management
  setCurrentProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  importProjectConfig: (sourceProjectId: string, targetProjectId: string, options: { templates: boolean, dictionaries: boolean }) => void;

  // Data Actions (Scoped to Current Project)
  addTag: (tag: Omit<Tag, 'projectId'>) => void;
  addTags: (tags: Omit<Tag, 'projectId'>[]) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  updateTagsStatus: (ids: string[], status: TagStatus) => void;
  deleteTag: (id: string) => void;
  deleteTags: (ids: string[]) => void;
  
  addTemplate: (template: Omit<Template, 'projectId'>) => void;
  deleteTemplate: (id: string) => void;
  
  addDictionaryItem: (item: Omit<DictionaryItem, 'projectId'>) => void;
  importDictionaryItems: (items: Omit<DictionaryItem, 'projectId'>[]) => void;
  deleteDictionaryItem: (id: string) => void;
  
  addGlobalVariable: (item: Omit<GlobalVariable, 'projectId'>) => void;
  deleteGlobalVariable: (id: string) => void;

  addReservedRange: (range: Omit<ReservedRange, 'projectId'>) => void;
  deleteReservedRange: (id: string) => void;
  
  getNextNumber: (prefix: string, padding: number) => number;
  loadProjectData: (data: AppState) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Global State ---
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('tagengine_db_v2');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
      currentUser: null,
      currentProjectId: null,
      projects: SEED_PROJECTS,
      tags: SEED_TAGS,
      templates: SEED_TEMPLATES,
      dictionaries: SEED_DICTIONARIES,
      reservedRanges: [],
      globalVariables: SEED_GLOBAL_VARS,
      counters: SEED_COUNTERS
    };
  });

  // --- Persistence ---
  
  // DB Saver
  useEffect(() => {
    localStorage.setItem('tagengine_db_v2', JSON.stringify(state));
  }, [state]);

  // Auth Checker (On Mount)
  useEffect(() => {
      const sessionUser = sessionStorage.getItem('te_auth_user');
      const localUser = localStorage.getItem('te_auth_user');
      if (!state.currentUser) {
          if (sessionUser) setState(s => ({...s, currentUser: JSON.parse(sessionUser)}));
          else if (localUser) setState(s => ({...s, currentUser: JSON.parse(localUser)}));
      }
  }, []);

  // --- Auth Actions ---
  const login = (userData: Partial<User>, rememberMe: boolean) => {
      // Role Based Access Control Logic (Hardcoded for Task)
      let role = 'user';
      let name = userData.name || 'User';

      if (userData.name === '1') {
          role = 'admin';
          name = 'Administrator';
      } else if (userData.name === '2') {
          role = 'user';
          name = 'Engineer';
      } else {
          // Fallback if name was passed directly
          role = userData.role || 'user';
      }

      const fullUser: User = {
          id: userData.id || 'u_' + Math.random(),
          name: name,
          email: userData.email || 'user@example.com',
          role: role
      };

      const userStr = JSON.stringify(fullUser);
      if (rememberMe) localStorage.setItem('te_auth_user', userStr);
      else sessionStorage.setItem('te_auth_user', userStr);
      
      setState(prev => ({ ...prev, currentUser: fullUser, currentProjectId: null }));
  };

  const logout = () => {
      localStorage.removeItem('te_auth_user');
      sessionStorage.removeItem('te_auth_user');
      setState(prev => ({ ...prev, currentUser: null, currentProjectId: null }));
  };

  // --- Project Actions ---
  const setCurrentProject = (id: string | null) => setState(p => ({ ...p, currentProjectId: id }));
  
  const addProject = (project: Project) => setState(p => ({ ...p, projects: [...p.projects, project] }));
  
  const updateProject = (id: string, updates: Partial<Project>) => 
      setState(p => ({ ...p, projects: p.projects.map(prj => prj.id === id ? { ...prj, ...updates } : prj) }));
  
  const deleteProject = (id: string) => setState(p => ({
      ...p,
      projects: p.projects.filter(prj => prj.id !== id),
      tags: p.tags.filter(t => t.projectId !== id),
      templates: p.templates.filter(t => t.projectId !== id),
      dictionaries: p.dictionaries.filter(d => d.projectId !== id),
      currentProjectId: p.currentProjectId === id ? null : p.currentProjectId
  }));

  const importProjectConfig = (sourceId: string, targetId: string, options: { templates: boolean, dictionaries: boolean }) => {
      const newTemplates: Template[] = [];
      const newDicts: DictionaryItem[] = [];
      const newVars: GlobalVariable[] = [];

      // Copy Templates
      if (options.templates) {
          const sourceTemplates = state.templates.filter(t => t.projectId === sourceId);
          sourceTemplates.forEach(tmpl => {
              newTemplates.push({
                  ...tmpl,
                  id: crypto.randomUUID(),
                  projectId: targetId,
                  name: `${tmpl.name} (Copy)`
              });
          });
          
          const sourceVars = state.globalVariables.filter(v => v.projectId === sourceId);
          sourceVars.forEach(v => {
              newVars.push({ ...v, id: crypto.randomUUID(), projectId: targetId });
          });
      }

      // Copy Dictionaries
      if (options.dictionaries) {
          const sourceDicts = state.dictionaries.filter(d => d.projectId === sourceId);
          sourceDicts.forEach(dict => {
              newDicts.push({
                  ...dict,
                  id: crypto.randomUUID(),
                  projectId: targetId
              });
          });
      }

      setState(prev => ({
          ...prev,
          templates: [...prev.templates, ...newTemplates],
          dictionaries: [...prev.dictionaries, ...newDicts],
          globalVariables: [...prev.globalVariables, ...newVars]
      }));
  };

  // --- Filtering Selectors (Return data ONLY for current project) ---
  const projectTags = useMemo(() => state.tags.filter(t => t.projectId === state.currentProjectId), [state.tags, state.currentProjectId]);
  const projectTemplates = useMemo(() => state.templates.filter(t => t.projectId === state.currentProjectId), [state.templates, state.currentProjectId]);
  const projectDicts = useMemo(() => state.dictionaries.filter(t => t.projectId === state.currentProjectId), [state.dictionaries, state.currentProjectId]);
  const projectRanges = useMemo(() => state.reservedRanges.filter(t => t.projectId === state.currentProjectId), [state.reservedRanges, state.currentProjectId]);
  const projectVars = useMemo(() => state.globalVariables.filter(t => t.projectId === state.currentProjectId), [state.globalVariables, state.currentProjectId]);

  // --- Scoped Actions ---
  const injectProject = <T extends object>(item: T): T & { projectId: string } => ({ ...item, projectId: state.currentProjectId || '' });

  const addTag = (tag: Omit<Tag, 'projectId'>) => setState(p => ({ ...p, tags: [...p.tags, injectProject(tag) as Tag] }));
  const addTags = (tags: Omit<Tag, 'projectId'>[]) => setState(p => ({ ...p, tags: [...p.tags, ...tags.map(t => injectProject(t) as Tag)] }));
  
  const updateTag = (id: string, updates: Partial<Tag>) => setState(p => ({ ...p, tags: p.tags.map(t => t.id === id ? { ...t, ...updates } : t) }));
  const updateTagsStatus = (ids: string[], status: TagStatus) => setState(p => ({ ...p, tags: p.tags.map(t => ids.includes(t.id) ? { ...t, status } : t) }));
  const deleteTag = (id: string) => setState(p => ({ ...p, tags: p.tags.filter(t => t.id !== id) }));
  const deleteTags = (ids: string[]) => setState(p => ({ ...p, tags: p.tags.filter(t => !ids.includes(t.id)) }));

  const addTemplate = (template: Omit<Template, 'projectId'>) => setState(p => ({ ...p, templates: [...p.templates, injectProject(template) as Template] }));
  const deleteTemplate = (id: string) => setState(p => ({ ...p, templates: p.templates.filter(t => t.id !== id) }));

  const addDictionaryItem = (item: Omit<DictionaryItem, 'projectId'>) => setState(p => ({ ...p, dictionaries: [...p.dictionaries, injectProject(item) as DictionaryItem] }));
  const importDictionaryItems = (items: Omit<DictionaryItem, 'projectId'>[]) => setState(p => ({ ...p, dictionaries: [...p.dictionaries, ...items.map(i => injectProject(i) as DictionaryItem)] }));
  const deleteDictionaryItem = (id: string) => setState(p => ({ ...p, dictionaries: p.dictionaries.filter(d => d.id !== id) }));

  const addGlobalVariable = (item: Omit<GlobalVariable, 'projectId'>) => setState(p => ({ ...p, globalVariables: [...p.globalVariables, injectProject(item) as GlobalVariable] }));
  const deleteGlobalVariable = (id: string) => setState(p => ({ ...p, globalVariables: p.globalVariables.filter(d => d.id !== id) }));

  const addReservedRange = (range: Omit<ReservedRange, 'projectId'>) => setState(p => ({ ...p, reservedRanges: [...p.reservedRanges, injectProject(range) as ReservedRange] }));
  const deleteReservedRange = (id: string) => setState(p => ({ ...p, reservedRanges: p.reservedRanges.filter(r => r.id !== id) }));

  const loadProjectData = (data: AppState) => {
      alert("Full DB Restore is disabled in Multi-Project Mode for safety.");
  };

  const getNextNumber = (prefix: string, padding: number): number => {
    if (!state.currentProjectId) return 1;
    const key = `${state.currentProjectId}_${prefix}`;
    
    let maxNum = state.counters[key] || 0;
    
    // Fallback if counter missing: scan existing tags
    if (maxNum === 0) {
        const matchingTags = projectTags.filter((t) => t.fullTag.startsWith(prefix));
        matchingTags.forEach((t) => {
            // Very basic heuristic: extract trailing numbers
            // Improved regex to handle complex suffixes if needed, but keeping simple for now
            const suffix = t.fullTag.slice(prefix.length);
            const digits = suffix.match(/^(\d+)/);
            if (digits) {
                const numPart = parseInt(digits[1], 10);
                if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            }
        });
    }

    let next = maxNum + 1;
    
    // Scoped Reservation Logic
    // Only check ranges that match the current generation prefix
    const relevantRanges = projectRanges.filter(r => r.scope === prefix);

    let isReserved = true;
    while (isReserved) {
      // Find if 'next' falls into any reserved range for this scope
      const blockingRange = relevantRanges.find(r => next >= r.start && next <= r.end);
      
      if (blockingRange) {
          // If reserved, skip to the end of that range + 1
          next = blockingRange.end + 1;
      } else {
          isReserved = false;
      }
    }
    
    // Note: Side effect in render/get is usually bad, but simplified for this architecture.
    // In strict Redux/Flux, generation would be an Action that updates Store.
    // Here we just update the in-memory counter for next call.
    state.counters[key] = next; 
    return next;
  };

  return (
    <StoreContext.Provider
      value={{
        ...state,
        tags: projectTags,
        templates: projectTemplates,
        dictionaries: projectDicts,
        reservedRanges: projectRanges,
        globalVariables: projectVars,
        
        login, logout,
        setCurrentProject, addProject, updateProject, deleteProject, importProjectConfig,
        
        addTag, addTags, updateTag, updateTagsStatus, deleteTag, deleteTags,
        addTemplate, deleteTemplate,
        addDictionaryItem, importDictionaryItems, deleteDictionaryItem,
        addGlobalVariable, deleteGlobalVariable,
        addReservedRange, deleteReservedRange,
        getNextNumber, loadProjectData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};