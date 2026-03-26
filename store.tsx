import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AppState, Tag, Template, DictionaryItem, ReservedRange, TagStatus, User, Project } from './types';
import { api } from './api';
import { toast } from 'sonner';

// --- SEED DATA (Default Project) ---
const DEFAULT_PROJECT_ID = 'proj_pdh2';

const SEED_PROJECTS: Project[] = [
    { id: DEFAULT_PROJECT_ID, name: 'PDH2 Construction', description: 'Propane Dehydrogenation Unit 2', createdAt: new Date().toISOString(), createdBy: 'System' },
    { id: 'proj_demo', name: 'Demo Plant A', description: 'Test environment', createdAt: new Date().toISOString(), createdBy: 'System' }
];

const SEED_DICTIONARIES: DictionaryItem[] = [
  { id: 'w1', projectId: DEFAULT_PROJECT_ID, category: 'Проект', code: '210', value: 'Дегидрирование пропана', description: 'Propane Dehydrogenation' },
  { id: 'e1', projectId: DEFAULT_PROJECT_ID, category: 'Тип Оборудования', code: 'P', value: 'Насос', description: 'Centrifugal/Reciprocating Pump' },
  { id: 'e2', projectId: DEFAULT_PROJECT_ID, category: 'Тип Оборудования', code: 'V', value: 'Емкость/Сосуд', description: 'Vessel/Drum' },
  { id: 'v1', projectId: DEFAULT_PROJECT_ID, category: 'Тип Арматуры', code: 'HV', value: 'Ручной клапан', description: 'Hand Valve' },
  { id: 'v2', projectId: DEFAULT_PROJECT_ID, category: 'Тип Арматуры', code: 'MOV', value: 'Клапан с электроприводом', description: 'Motor Operated Valve' },
];

const SEED_TEMPLATES: Template[] = [
  {
    id: 't_mech',
    projectId: DEFAULT_PROJECT_ID,
    name: 'Механическое оборудование (P/V/E)',
    description: 'PDH2 Структура: [Тип]-[Проект][Номер][Суффикс]. Пример: P-21301A',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'b1', type: 'dictionary', categoryId: 'Тип Оборудования' },
      { id: 'b2', type: 'separator', value: '-' },
      { id: 'b3', type: 'dictionary', categoryId: 'Проект' },
      { id: 'b4', type: 'number', isAutoIncrement: true, padding: 2 }, 
      { id: 'b5', type: 'text', value: '', isSuffix: true }, 
    ],
  }
];

const SEED_TAGS: Tag[] = [
  {
    id: 'tag_demo_1',
    projectId: DEFAULT_PROJECT_ID,
    fullTag: 'P-21001',
    parts: { b1: 'P', b3: '210', b4: '01', b5: '' },
    templateId: 't_mech',
    status: 'active',
    createdAt: new Date().toISOString(),
    history: [{ action: 'Создан', timestamp: new Date().toISOString(), user: 'System' }],
  }
];

const SEED_COUNTERS: Record<string, number> = {
    [`${DEFAULT_PROJECT_ID}_P-210`]: 1
};

// --- Context Definition ---

interface StoreContextType extends AppState {
  // Auth
  login: (credentials: { email: string; password?: string }, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  
  // Project Management
  setCurrentProject: (id: string | null) => void;
  fetchProjectData: (projectId: string) => Promise<void>;
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
  updateDictionaryItem: (id: string, updates: Partial<DictionaryItem>) => void;
  importDictionaryItems: (items: Omit<DictionaryItem, 'projectId'>[]) => void;
  deleteDictionaryItem: (id: string) => void;

  addReservedRange: (range: Omit<ReservedRange, 'projectId'>) => void;
  deleteReservedRange: (id: string) => void;
  
  getNextNumber: (prefix: string, padding: number) => number;
  loadProjectData: (data: AppState) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Global State ---
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('tagengine_db_v4'); // Version bumped
    if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, isLoading: false, error: null };
    }
    return {
      currentUser: null,
      currentProjectId: null,
      projects: SEED_PROJECTS,
      tags: SEED_TAGS,
      templates: SEED_TEMPLATES,
      dictionaries: SEED_DICTIONARIES,
      reservedRanges: [],
      counters: SEED_COUNTERS,
      isLoading: false,
      error: null,
    };
  });

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('tagengine_db_v4', JSON.stringify(state));
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
  const login = async (credentials: { email: string; password?: string }, rememberMe: boolean) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
          // Временно используем мок-логику, пока бэкенд не запущен
          // const response = await api.post('/auth/login', credentials);
          // const { token, user } = response.data;
          
          // Мок-логика для тестирования UI без запущенного бэкенда
          let role = 'user';
          let name = 'User';
          if (credentials.email === 'admin@test.com') { role = 'admin'; name = 'Administrator'; }
          else if (credentials.email === 'manager@test.com') { role = 'manager'; name = 'Project Manager'; }
          else if (credentials.email === 'hvac@test.com') { role = 'hvac_engineer'; name = 'HVAC Engineer'; }
          else if (credentials.email === 'auto@test.com') { role = 'automation_engineer'; name = 'Automation Engineer'; }
          else { throw new Error('Неверный логин или пароль'); }

          const user = { id: 'u_' + Math.random(), name, email: credentials.email, role };
          const token = 'mock-jwt-token';

          const userStr = JSON.stringify(user);
          if (rememberMe) {
              localStorage.setItem('te_auth_user', userStr);
              localStorage.setItem('te_jwt_token', token);
          } else {
              sessionStorage.setItem('te_auth_user', userStr);
              sessionStorage.setItem('te_jwt_token', token);
          }
          
          setState(prev => ({ ...prev, currentUser: user, currentProjectId: null, isLoading: false }));
          toast.success('Успешный вход');
      } catch (error: any) {
          setState(prev => ({ ...prev, isLoading: false, error: error.response?.data?.message || error.message || 'Ошибка авторизации' }));
          toast.error('Ошибка авторизации');
          throw error;
      }
  };

  const logout = () => {
      localStorage.removeItem('te_auth_user');
      localStorage.removeItem('te_jwt_token');
      sessionStorage.removeItem('te_auth_user');
      sessionStorage.removeItem('te_jwt_token');
      setState(prev => ({ ...prev, currentUser: null, currentProjectId: null }));
  };

  // --- Project Actions ---
  const setCurrentProject = (id: string | null) => {
      setState(p => ({ ...p, currentProjectId: id }));
      if (id) {
          fetchProjectData(id);
      }
  };

  const fetchProjectData = async (projectId: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
          // Здесь будет реальный запрос:
          // const [tagsRes, templatesRes, dictsRes] = await Promise.all([
          //     api.get(`/projects/${projectId}/tags`),
          //     api.get(`/projects/${projectId}/templates`),
          //     api.get(`/projects/${projectId}/dictionaries`)
          // ]);
          // setState(prev => ({ ...prev, tags: tagsRes.data, templates: templatesRes.data, dictionaries: dictsRes.data, isLoading: false }));
          
          // Пока используем локальные данные
          setState(prev => ({ ...prev, isLoading: false }));
      } catch (error: any) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Ошибка загрузки данных проекта' }));
          toast.error('Не удалось загрузить данные проекта');
      }
  };
  
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
          dictionaries: [...prev.dictionaries, ...newDicts]
      }));
  };

  // --- Filtering Selectors (Return data ONLY for current project) ---
  const projectTags = useMemo(() => state.tags.filter(t => t.projectId === state.currentProjectId), [state.tags, state.currentProjectId]);
  const projectTemplates = useMemo(() => state.templates.filter(t => t.projectId === state.currentProjectId), [state.templates, state.currentProjectId]);
  const projectDicts = useMemo(() => state.dictionaries.filter(t => t.projectId === state.currentProjectId), [state.dictionaries, state.currentProjectId]);
  const projectRanges = useMemo(() => state.reservedRanges.filter(t => t.projectId === state.currentProjectId), [state.reservedRanges, state.currentProjectId]);

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
  const updateDictionaryItem = (id: string, updates: Partial<DictionaryItem>) => setState(p => ({ ...p, dictionaries: p.dictionaries.map(d => d.id === id ? { ...d, ...updates } : d) }));
  const importDictionaryItems = (items: Omit<DictionaryItem, 'projectId'>[]) => setState(p => ({ ...p, dictionaries: [...p.dictionaries, ...items.map(i => injectProject(i) as DictionaryItem)] }));
  const deleteDictionaryItem = (id: string) => setState(p => ({ ...p, dictionaries: p.dictionaries.filter(d => d.id !== id) }));

  const addReservedRange = (range: Omit<ReservedRange, 'projectId'>) => setState(p => ({ ...p, reservedRanges: [...p.reservedRanges, injectProject(range) as ReservedRange] }));
  const deleteReservedRange = (id: string) => setState(p => ({ ...p, reservedRanges: p.reservedRanges.filter(r => r.id !== id) }));

  const loadProjectData = (data: AppState) => {
      toast.error("Full DB Restore is disabled in Multi-Project Mode for safety.");
  };

  const getNextNumber = (prefix: string, padding: number): number => {
    if (!state.currentProjectId) return 1;
    const key = `${state.currentProjectId}_${prefix}`;
    
    let maxNum = state.counters[key] || 0;
    
    // Fallback if counter missing: scan existing tags
    if (maxNum === 0) {
        const matchingTags = projectTags.filter((t) => t.fullTag.startsWith(prefix));
        matchingTags.forEach((t) => {
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
    const relevantRanges = projectRanges.filter(r => r.scope === prefix);

    let isReserved = true;
    while (isReserved) {
      const blockingRange = relevantRanges.find(r => next >= r.start && next <= r.end);
      if (blockingRange) {
          next = blockingRange.end + 1;
      } else {
          isReserved = false;
      }
    }
    
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
        
        login, logout,
        setCurrentProject, addProject, updateProject, deleteProject, importProjectConfig,
        
        addTag, addTags, updateTag, updateTagsStatus, deleteTag, deleteTags,
        addTemplate, deleteTemplate,
        addDictionaryItem, updateDictionaryItem, importDictionaryItems, deleteDictionaryItem,
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