'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Permission } from '@/lib/permissions';

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  permissions: Permission[];
}

interface UserContextType {
  user: User;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  user: User;
  children: ReactNode;
}

export function UserProvider({ user, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
