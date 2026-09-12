'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminAuthContextType {
  isAdmin: boolean;
  adminEmail: string | null;
  loginAsAdmin: (email: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  adminEmail: null,
  loginAsAdmin: () => {},
  logout: () => {}
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(true); // default authorized in local dev, switchable
  const [adminEmail, setAdminEmail] = useState<string | null>('admin@echrimheni.dz');

  const loginAsAdmin = (email: string) => {
    setIsAdmin(true);
    setAdminEmail(email);
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminEmail(null);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, adminEmail, loginAsAdmin, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
