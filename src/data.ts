/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceCategory, Ticket, Guiche, HistoricalRecord, UserAccount } from './types';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user_fabio',
    name: 'Fábio Chaves',
    email: 'fabio.freitas.chaves@gmail.com',
    role: 'attendant',
    password: '123',
    guicheNumber: 1,
  },
  {
    id: 'user_admin',
    name: 'Fábio Freitas',
    email: 'admin@iteraima.rr.gov.br',
    role: 'supervisor',
    password: 'admin',
  }
];

export const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    id: 'geral',
    name: 'Atendimento Geral',
    prefix: 'A',
    description: 'Serviços básicos, dúvidas e solicitações gerais de balcão.',
    icon: 'User',
    color: 'emerald',
    bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    borderCol: 'border-emerald-500',
    textColor: 'text-emerald-600',
    avgDurationMin: 15,
    department: 'Setor de Protocolo',
  },
  {
    id: 'prioritario',
    name: 'Prioritário (Lei nº 10.048)',
    prefix: 'P',
    description: 'Idosos, gestantes, pessoas com deficiência ou autismo.',
    icon: 'Award',
    color: 'amber',
    bgLight: 'bg-amber-50 text-amber-800 border-amber-200',
    borderCol: 'border-amber-500',
    textColor: 'text-amber-600',
    avgDurationMin: 10,
    department: 'Atendimento Preferencial',
  },
  {
    id: 'exclusivo',
    name: 'Serviços Especiais',
    prefix: 'S',
    description: 'Abertura de contas, contratos complexos e consultoria jurídica.',
    icon: 'Briefcase',
    color: 'indigo',
    bgLight: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    borderCol: 'border-indigo-500',
    textColor: 'text-indigo-600',
    avgDurationMin: 25,
    department: 'Diretoria de Habitação e Terras',
  },
  {
    id: 'rapido',
    name: 'Retiradas e Rápido',
    prefix: 'R',
    description: 'Apenas retirada de senhas, cartões, e assinaturas express.',
    icon: 'Zap',
    color: 'sky',
    bgLight: 'bg-sky-50 text-sky-800 border-sky-100',
    borderCol: 'border-sky-500',
    textColor: 'text-sky-600',
    avgDurationMin: 4,
    department: 'Entrega Rápida de Títulos',
  },
];

export const INITIAL_GUICHES: Guiche[] = [
  {
    id: 'guiche_1',
    number: 1,
    attendantName: 'Fábio Chaves',
    currentTicket: null,
    status: 'offline',
    categoryFocus: ['geral', 'prioritario', 'rapido'],
    isCallingAnimation: false,
  },
  {
    id: 'guiche_2',
    number: 2,
    currentTicket: null,
    status: 'offline',
    categoryFocus: ['geral', 'prioritario', 'exclusivo'],
    isCallingAnimation: false,
  },
  {
    id: 'guiche_3',
    number: 3,
    currentTicket: null,
    status: 'offline',
    categoryFocus: ['rapido', 'geral'],
    isCallingAnimation: false,
  },
  {
    id: 'guiche_4',
    number: 4,
    currentTicket: null,
    status: 'offline',
    categoryFocus: ['prioritario', 'exclusivo'],
    isCallingAnimation: false,
  },
];

export const generateInitialTickets = (): Ticket[] => {
  const categories = DEFAULT_CATEGORIES;
  const now = Date.now();
  
  return [
    {
      id: 't_1',
      number: 14,
      code: 'A-014',
      category: categories[0], // Geral
      createdAt: now - 18 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_2',
      number: 5,
      code: 'P-005',
      category: categories[1], // Prioritario
      createdAt: now - 3 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_3',
      number: 3,
      code: 'S-003',
      category: categories[2], // Especiais
      createdAt: now - 22 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_4',
      number: 29,
      code: 'R-029',
      category: categories[3], // Rapido
      createdAt: now - 1 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_5',
      number: 15,
      code: 'A-015',
      category: categories[0],
      createdAt: now - 12 * 60 * 1000,
      status: 'waiting',
    }
  ];
};

export const generateInitialHistory = (): HistoricalRecord[] => {
  const now = Date.now();
  const baseRecords: HistoricalRecord[] = [
    {
      id: 'h_1',
      code: 'P-001',
      categoryName: 'Prioritário',
      categoryPrefix: 'P',
      waitTimeSec: 120, // 2 mins
      serviceTimeSec: 360, // 6 mins
      status: 'completed',
      guicheNumber: 1,
      attendantName: 'Fábio Chaves',
      timestamp: now - 50 * 60 * 1000,
      rating: 5,
    },
    {
      id: 'h_2',
      code: 'A-010',
      categoryName: 'Atendimento Geral',
      categoryPrefix: 'A',
      waitTimeSec: 680, // 11 mins
      serviceTimeSec: 840, // 14 mins
      status: 'completed',
      guicheNumber: 2,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 40 * 60 * 1000,
      rating: 4,
    },
    {
      id: 'h_3',
      code: 'R-027',
      categoryName: 'Retiradas e Rápido',
      categoryPrefix: 'R',
      waitTimeSec: 90, // 1.5 mins
      serviceTimeSec: 150, // 2.5 mins
      status: 'completed',
      guicheNumber: 3,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 32 * 60 * 1000,
      rating: 5,
    },
    {
      id: 'h_4',
      code: 'S-001',
      categoryName: 'Serviços Especiais',
      categoryPrefix: 'S',
      text: 'Abertura de contas, contratos complexos e consultoria jurídica.',
      waitTimeSec: 1420, // ~23 mins
      serviceTimeSec: 1680, // 28 mins
      status: 'completed',
      guicheNumber: 4,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 25 * 60 * 1000,
      rating: 3,
    } as any,
    {
      id: 'h_5',
      code: 'A-011',
      categoryName: 'Atendimento Geral',
      categoryPrefix: 'A',
      waitTimeSec: 810,
      serviceTimeSec: 720,
      status: 'completed',
      guicheNumber: 1,
      attendantName: 'Fábio Chaves',
      timestamp: now - 18 * 60 * 1000,
      rating: 5,
    },
    {
      id: 'h_6',
      code: 'P-002',
      categoryName: 'Prioritário',
      categoryPrefix: 'P',
      waitTimeSec: 180,
      serviceTimeSec: 420,
      status: 'completed',
      guicheNumber: 2,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 10 * 60 * 1000,
      rating: 4,
    },
    {
      id: 'h_7',
      code: 'R-028',
      categoryName: 'Retiradas e Rápido',
      categoryPrefix: 'R',
      waitTimeSec: 110,
      serviceTimeSec: 130,
      status: 'no_show',
      guicheNumber: 1,
      attendantName: 'Fábio Chaves',
      timestamp: now - 5 * 60 * 1000,
    }
  ];

  // Map to assign dynamically unique IDs on generation/hydration, preventing any duplicate key errors
  return baseRecords.map((rec, index) => ({
    ...rec,
    id: `h_gen_${now}_${index}_${Math.random().toString(36).substring(2, 9)}`
  }));
};
