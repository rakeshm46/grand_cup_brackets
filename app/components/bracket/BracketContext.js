'use client';
import { createContext } from 'react';

export const BracketContext = createContext({
  tradersById: {},
  tradersList: []
});
