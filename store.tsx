import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Tag, Template, DictionaryItem, ReservedRange, AuditLog, TagStatus, User } from './types';

// --- Seed Data based on PDH2 Project Procedure ---

const SEED_DICTIONARIES: DictionaryItem[] = [
  // WBS / System Codes
  { id: 'w1', category: 'WBS/Система', code: '210', value: 'Дегидрирование пропана', description: 'Propane Dehydrogenation' },
  { id: 'w2', category: 'WBS/Система', code: '213', value: 'Фракционирование', description: 'Fractionation' },
  { id: 'w3', category: 'WBS/Система', code: '320', value: 'Общезаводское хозяйство', description: 'Utilities' },
  { id: 'w4', category: 'WBS/Система', code: '391', value: 'Электроснабжение', description: 'Power Supply' },

  // Mechanical Equipment Codes (Attachment 3.1)
  { id: 'e1', category: 'Тип Оборудования', code: 'P', value: 'Насос', description: 'Centrifugal/Reciprocating Pump' },
  { id: 'e2', category: 'Тип Оборудования', code: 'V', value: 'Емкость/Сосуд', description: 'Vessel/Drum' },
  { id: 'e3', category: 'Тип Оборудования', code: 'E', value: 'Теплообменник', description: 'Heat Exchanger' },
  { id: 'e4', category: 'Тип Оборудования', code: 'TK', value: 'Резервуар', description: 'Tank' },
  { id: 'e5', category: 'Тип Оборудования', code: 'K', value: 'Компрессор', description: 'Compressor' },
  { id: 'e6', category: 'Тип Оборудования', code: 'PK', value: 'Комплектная установка', description: 'Package Unit' },

  // Valve Codes (Attachment 5.3)
  { id: 'v1', category: 'Тип Арматуры', code: 'HV', value: 'Ручной клапан', description: 'Hand Valve' },
  { id: 'v2', category: 'Тип Арматуры', code: 'MOV', value: 'Клапан с электроприводом', description: 'Motor Operated Valve' },
  { id: 'v3', category: 'Тип Арматуры', code: 'XV', value: 'Отсечной клапан', description: 'On-Off Valve' },
  { id: 'v4', category: 'Тип Арматуры', code: 'PSV', value: 'Предохранительный клапан', description: 'Pressure Safety Valve' },

  // Fluid Codes (PDH2-0000-25F-0002)
  { id: 'f1', category: 'Среда', code: 'PG', value: 'Технологический газ', description: 'Process Gas' },
  { id: 'f2', category: 'Среда', code: 'IA', value: 'Воздух КИП', description: 'Instrument Air' },
  { id: 'f3', category: 'Среда', code: 'N2', value: 'Азот', description: 'Nitrogen' },
  
  // Electrical Equipment (Attachment 6.1)
  { id: 'el1', category: 'Тип Электро', code: 'SG', value: 'Распредустройство (Switchgear)', description: '' },
  { id: 'el2', category: 'Тип Электро', code: 'TR', value: 'Трансформатор', description: '' },
];

const SEED_TEMPLATES: Template[] = [
  {
    id: 't_mech',
    name: 'Механическое оборудование (P/V/E)',
    description: 'PDH2 Структура: [Тип]-[WBS][Номер][Суффикс]. Пример: P-21301A',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'b1', type: 'dictionary', categoryId: 'Тип Оборудования' },
      { id: 'b2', type: 'separator', value: '-' },
      { id: 'b3', type: 'dictionary', categoryId: 'WBS/Система' },
      { id: 'b4', type: 'number', isAutoIncrement: true, padding: 2 }, // PDH2 использует 01..99
      { id: 'b5', type: 'text', value: '', isSuffix: true }, // A, B, C
    ],
  },
  {
    id: 't_line',
    name: 'Линия Трубопровода',
    description: 'PDH2 Структура: [WBS]-[Номер]-[Среда]. Пример: 320-1210-PG',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'l1', type: 'dictionary', categoryId: 'WBS/Система' },
      { id: 'l2', type: 'separator', value: '-' },
      { id: 'l3', type: 'number', isAutoIncrement: true, padding: 4 }, // PDH2 использует 0001..9999
      { id: 'l4', type: 'separator', value: '-' },
      { id: 'l5', type: 'dictionary', categoryId: 'Среда' },
    ],
  },
  {
    id: 't_valve',
    name: 'Арматура / Клапаны',
    description: 'PDH2 Структура: [WBS]-[Тип]-[Номер]. Пример: 213-HV-0001',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'v1', type: 'dictionary', categoryId: 'WBS/Система' },
      { id: 'v2', type: 'separator', value: '-' },
      { id: 'v3', type: 'dictionary', categoryId: 'Тип Арматуры' },
      { id: 'v4', type: 'separator', value: '-' },
      { id: 'v5', type: 'number', isAutoIncrement: true, padding: 4 },
    ],
  },
  {
    id: 't_motor',
    name: 'Эл. двигатель (Зависимый)',
    description: 'Привязка к механике: [КодЭл]-[Родитель]. Пример: PM-32001',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'm1', type: 'text', value: 'PM' }, // Хардкод или словарь для типа привода
      { id: 'm2', type: 'separator', value: '-' },
      { id: 'm3', type: 'parent', value: '' }, // Ссылка на P-32001, генератор должен вырезать 'P-'
    ],
  }
];

const SEED_RANGES: ReservedRange[] = [];

const SEED_TAGS: Tag[] = [
  {
    id: 'tag_demo_1',
    fullTag: 'P-21301A',
    parts: { b1: 'P', b3: '213', b4: '01', b5: 'A' },
    templateId: 't_mech',
    status: 'active',
    createdAt: new Date().toISOString(),
    history: [{ action: 'Создан', timestamp: new Date().toISOString(), user: 'System' }],
  },
  {
    id: 'tag_demo_2',
    fullTag: 'P-21301B',
    parts: { b1: 'P', b3: '213', b4: '01', b5: 'B' },
    templateId: 't_mech',
    status: 'active',
    createdAt: new Date().toISOString(),
    history: [{ action: 'Создан', timestamp: new Date().toISOString(), user: 'System' }],
  }
];

const SEED_COUNTERS = {
    'P-213': 1
};

// --- Context ---

interface StoreContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  addTag: (tag: Tag) => void;
  addTags: (tags: Tag[]) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  updateTagsStatus: (ids: string[], status: TagStatus) => void;
  deleteTag: (id: string) => void;
  deleteTags: (ids: string[]) => void;
  addTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  addDictionaryItem: (item: DictionaryItem) => void;
  importDictionaryItems: (items: DictionaryItem[]) => void;
  deleteDictionaryItem: (id: string) => void;
  addReservedRange: (range: ReservedRange) => void;
  deleteReservedRange: (id: string) => void;
  getNextNumber: (prefix: string, padding: number) => number;
  loadProjectData: (data: AppState) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('tagengine_pdh2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.counters) parsed.counters = {};
      return parsed;
    }
    return {
      currentUser: null,
      tags: SEED_TAGS,
      templates: SEED_TEMPLATES,
      dictionaries: SEED_DICTIONARIES,
      reservedRanges: SEED_RANGES,
      counters: SEED_COUNTERS
    };
  });

  useEffect(() => {
    localStorage.setItem('tagengine_pdh2', JSON.stringify(state));
  }, [state]);

  // --- Actions ---

  const login = (user: User) => {
      setState(prev => ({ ...prev, currentUser: user }));
  };

  const logout = () => {
      setState(prev => ({ ...prev, currentUser: null }));
  };

  const addTag = (tag: Tag) => {
    setState((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
  };

  const addTags = (newTags: Tag[]) => {
    setState((prev) => {
      return { ...prev, tags: [...prev.tags, ...newTags] };
    });
  };

  const updateTag = (id: string, updates: Partial<Tag>) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const updateTagsStatus = (ids: string[], status: TagStatus) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((t) => ids.includes(t.id) ? { ...t, status } : t)
    }));
  };

  const deleteTag = (id: string) => {
    setState((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== id) }));
  };

  const deleteTags = (ids: string[]) => {
    setState((prev) => ({ ...prev, tags: prev.tags.filter((t) => !ids.includes(t.id)) }));
  };

  const addTemplate = (template: Template) => {
    setState((prev) => ({ ...prev, templates: [...prev.templates, template] }));
  };

  const deleteTemplate = (id: string) => {
    setState((prev) => ({ ...prev, templates: prev.templates.filter((t) => t.id !== id) }));
  };

  const addDictionaryItem = (item: DictionaryItem) => {
    setState((prev) => ({ ...prev, dictionaries: [...prev.dictionaries, item] }));
  };

  const importDictionaryItems = (items: DictionaryItem[]) => {
    setState((prev) => ({ ...prev, dictionaries: [...prev.dictionaries, ...items] }));
  };

  const deleteDictionaryItem = (id: string) => {
    setState((prev) => ({ ...prev, dictionaries: prev.dictionaries.filter((d) => d.id !== id) }));
  };

  const addReservedRange = (range: ReservedRange) => {
    setState((prev) => ({ ...prev, reservedRanges: [...prev.reservedRanges, range] }));
  };

  const deleteReservedRange = (id: string) => {
    setState((prev) => ({ ...prev, reservedRanges: prev.reservedRanges.filter((r) => r.id !== id) }));
  };

  const loadProjectData = (data: AppState) => {
      if(window.confirm("Это действие перезапишет все текущие данные. Вы уверены?")) {
          setState({ ...data, currentUser: state.currentUser }); // Keep current user session
      }
  };

  // Logic to find the next available number
  const getNextNumber = (prefix: string, padding: number): number => {
    let maxNum = state.counters[prefix] || 0;

    // Scan if not in cache (safety fallback)
    if (maxNum === 0) {
        const matchingTags = state.tags.filter((t) => t.fullTag.startsWith(prefix));
        matchingTags.forEach((t) => {
            // Logic: Remove prefix, check if next chars are digits
            const suffix = t.fullTag.slice(prefix.length);
            const digits = suffix.match(/^(\d+)/);
            if (digits) {
                const numPart = parseInt(digits[1], 10);
                if (!isNaN(numPart) && numPart > maxNum) {
                    maxNum = numPart;
                }
            }
        });
    }

    let next = maxNum + 1;

    // Check reserved ranges
    let isReserved = true;
    while (isReserved) {
      const inRange = state.reservedRanges.some(r => next >= r.start && next <= r.end);
      if (inRange) {
        next++;
      } else {
        isReserved = false;
      }
    }
    
    // Update counter implicitly for this session
    state.counters[prefix] = next; 
    
    return next;
  };

  return (
    <StoreContext.Provider
      value={{
        ...state,
        login,
        logout,
        addTag,
        addTags,
        updateTag,
        updateTagsStatus,
        deleteTag,
        deleteTags,
        addTemplate,
        deleteTemplate,
        addDictionaryItem,
        importDictionaryItems,
        deleteDictionaryItem,
        addReservedRange,
        deleteReservedRange,
        getNextNumber,
        loadProjectData,
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