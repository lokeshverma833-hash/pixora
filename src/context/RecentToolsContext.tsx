import React, { createContext, useContext, useEffect, useState } from 'react';
import { TOOLS } from '../data/tools';
import { ToolItem } from '../types';

interface RecentToolsContextType {
  recentTools: ToolItem[];
  addRecentTool: (toolId: string) => void;
  clearRecentTools: () => void;
}

const RecentToolsContext = createContext<RecentToolsContextType | undefined>(undefined);

export const RecentToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pixora_recent_tools');
      return saved ? JSON.parse(saved) : ['compress-image', 'resize-image', 'merge-pdf', 'passport-photo'];
    } catch {
      return ['compress-image', 'resize-image', 'merge-pdf', 'passport-photo'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pixora_recent_tools', JSON.stringify(recentIds));
    } catch {}
  }, [recentIds]);

  const addRecentTool = (toolId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== toolId);
      return [toolId, ...filtered].slice(0, 8);
    });
  };

  const clearRecentTools = () => {
    setRecentIds([]);
  };

  const recentTools = recentIds
    .map((id) => TOOLS.find((t) => t.id === id || t.slug === id))
    .filter((t): t is ToolItem => t !== undefined);

  return (
    <RecentToolsContext.Provider value={{ recentTools, addRecentTool, clearRecentTools }}>
      {children}
    </RecentToolsContext.Provider>
  );
};

export function useRecentTools() {
  const context = useContext(RecentToolsContext);
  if (!context) {
    throw new Error('useRecentTools must be used within a RecentToolsProvider');
  }
  return context;
}
