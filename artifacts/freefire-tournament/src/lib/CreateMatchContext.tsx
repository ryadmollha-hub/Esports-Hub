import { createContext, useContext, useState, type ReactNode } from "react";

interface CreateMatchContextValue {
  open: boolean;
  openCreateMatch: () => void;
  closeCreateMatch: () => void;
}

const CreateMatchContext = createContext<CreateMatchContextValue | null>(null);

export function CreateMatchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CreateMatchContext.Provider value={{ open, openCreateMatch: () => setOpen(true), closeCreateMatch: () => setOpen(false) }}>
      {children}
    </CreateMatchContext.Provider>
  );
}

export function useCreateMatch(): CreateMatchContextValue {
  const ctx = useContext(CreateMatchContext);
  if (!ctx) throw new Error("useCreateMatch must be used inside CreateMatchProvider");
  return ctx;
}
