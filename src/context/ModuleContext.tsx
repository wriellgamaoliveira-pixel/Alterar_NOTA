import React, { createContext, useContext, useState, useCallback } from 'react';
import type { FiscalModule } from '@/types/fiscal';

interface ModuleContextType {
  activeModule: FiscalModule;
  setActiveModule: (module: FiscalModule) => void;
  getModulePath: (path: string) => string;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [activeModule, setActiveModuleState] = useState<FiscalModule>('nfcom');

  const setActiveModule = useCallback((module: FiscalModule) => {
    setActiveModuleState(module);
  }, []);

  const getModulePath = useCallback((path: string) => {
    return path;
  }, [activeModule]);

  return (
    <ModuleContext.Provider value={{ activeModule, setActiveModule, getModulePath }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within ModuleProvider');
  }
  return context;
}
