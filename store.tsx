import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Tag, Template, DictionaryItem, ReservedRange, AuditLog } from './types';

// --- Seed Data ---
const SEED_DICTIONARIES: DictionaryItem[] = [
  { id: 'd1', category: 'Проект', code: 'PRJ1', value: 'Проект Альфа', description: 'Главный объект' },
  { id: 'd2', category: 'Проект', code: 'PRJ2', value: 'Проект Бета', description: 'Расширение' },
  { id: 'd3', category: 'Система', code: 'HVAC', value: 'ОВиК', description: 'Отопление и вентиляция' },
  { id: 'd4', category: 'Система', code: 'ELEC', value: 'Электрика', description: 'Энергоснабжение' },
  { id: 'd5', category: 'Оборудование', code: 'PUMP', value: 'Насос центробежный', description: '' },
  { id: 'd6', category: 'Оборудование', code: 'VALV', value: 'Задвижка', description: '' },
];

const SEED_TEMPLATES: Template[] = [
  {
    id: 't1',
    name: 'Стандартное оборудование',
    description: 'Формат: [Проект]-[Система]-[Оборуд]-[001]',
    createdAt: new Date().toISOString(),
    blocks: [
      { id: 'b1', type: 'dictionary', categoryId: 'Проект' },
      { id: 'b2', type: 'separator', value: '-' },
      { id: 'b3', type: 'dictionary', categoryId: 'Система' },
      { id: 'b4', type: 'separator', value: '-' },
      { id: 'b5', type: 'dictionary', categoryId: 'Оборудование' },
      { id: 'b6', type: 'separator', value: '-' },
      { id: 'b7', type: 'number', isAutoIncrement: true, padding: 3 },
    ],
  },
];

const SEED_RANGES: ReservedRange[] = [
  { id: 'r1', start: 660, end: 666, reason: 'Зарезервировано (суеверие)' },
];

const SEED_TAGS: Tag[] = [
  {
    id: 'tag1',
    fullTag: 'PRJ1-HVAC-PUMP-001',
    parts: { b1: 'PRJ1', b3: 'HVAC', b5: 'PUMP', b7: '001' },
    templateId: 't1',
    status: 'active',
    createdAt: new Date().toISOString(),
    history: [{ action: 'Создан', timestamp: new Date().toISOString(), user: 'Система' }],
  },
];

// --- Context ---

interface StoreContextType extends AppState {
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  addDictionaryItem: (item: DictionaryItem) => void;
  deleteDictionaryItem: (id: string) => void;
  addReservedRange: (range: ReservedRange) => void;
  deleteReservedRange: (id: string) => void;
  getNextNumber: (prefix: string, padding: number) => number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('tagengine_v1_ru');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      tags: SEED_TAGS,
      templates: SEED_TEMPLATES,
      dictionaries: SEED_DICTIONARIES,
      reservedRanges: SEED_RANGES,
    };
  });

  useEffect(() => {
    localStorage.setItem('tagengine_v1_ru', JSON.stringify(state));
  }, [state]);

  const addTag = (tag: Tag) => {
    setState((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
  };

  const updateTag = (id: string, updates: Partial<Tag>) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const deleteTag = (id: string) => {
    setState((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== id) }));
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

  const deleteDictionaryItem = (id: string) => {
    setState((prev) => ({ ...prev, dictionaries: prev.dictionaries.filter((d) => d.id !== id) }));
  };

  const addReservedRange = (range: ReservedRange) => {
    setState((prev) => ({ ...prev, reservedRanges: [...prev.reservedRanges, range] }));
  };

  const deleteReservedRange = (id: string) => {
    setState((prev) => ({ ...prev, reservedRanges: prev.reservedRanges.filter((r) => r.id !== id) }));
  };

  // Logic to find the next available number
  const getNextNumber = (prefix: string, padding: number): number => {
    // 1. Find all tags that start with this prefix
    const matchingTags = state.tags.filter((t) => t.fullTag.startsWith(prefix));
    
    // 2. Extract numbers
    let maxNum = 0;
    matchingTags.forEach((t) => {
      // Assuming number is at the end or we can strip the prefix
      const suffix = t.fullTag.slice(prefix.length);
      const numPart = parseInt(suffix, 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    });

    let next = maxNum + 1;

    // 3. Check reserved ranges
    let isReserved = true;
    while (isReserved) {
      const inRange = state.reservedRanges.some(r => next >= r.start && next <= r.end);
      if (inRange) {
        next++;
      } else {
        isReserved = false;
      }
    }

    return next;
  };

  return (
    <StoreContext.Provider
      value={{
        ...state,
        addTag,
        updateTag,
        deleteTag,
        addTemplate,
        deleteTemplate,
        addDictionaryItem,
        deleteDictionaryItem,
        addReservedRange,
        deleteReservedRange,
        getNextNumber,
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