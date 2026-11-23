"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ClientUser = { id: string; name: string; email: string; role: "CUSTOMER" | "STAFF" | "ADMIN" } | null;

const SessionContext = createContext<ClientUser>(null);

export function SessionProvider({ user, children }: { user: ClientUser; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export const useSessionUser = () => useContext(SessionContext);
