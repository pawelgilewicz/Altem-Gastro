import React, { createContext, useContext, useMemo } from 'react';
import { TENANT } from './config';

const Ctx = createContext(TENANT.theme);
export const ThemeProvider = ({ children }) => <Ctx.Provider value={TENANT.theme}>{children}</Ctx.Provider>;
export const useTheme = () => useContext(Ctx);
// factory musi być zdefiniowana na poziomie modułu (stabilna referencja)
export const useStyles = (factory) => { const t = useTheme(); return useMemo(() => factory(t), [t, factory]); };