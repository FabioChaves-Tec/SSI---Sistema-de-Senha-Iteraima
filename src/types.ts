/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TicketStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'no_show';

export interface ServiceCategory {
  id: string;
  name: string;
  prefix: string;
  description: string;
  icon: string;
  color: string;
  bgLight: string;
  borderCol: string;
  textColor: string;
  avgDurationMin: number;
  department?: string; // Associated department
}

export interface Ticket {
  id: string;
  number: number;
  code: string;
  category: ServiceCategory;
  createdAt: number;
  calledAt?: number;
  servingStartedAt?: number;
  completedAt?: number;
  guicheNumber?: number;
  attendantName?: string;
  status: TicketStatus;
}

export interface Guiche {
  id: string;
  number: number;
  attendantName?: string;
  currentTicket: Ticket | null;
  status: 'offline' | 'idle' | 'calling' | 'serving';
  categoryFocus: string[]; // Category IDs this desk can handle
  isCallingAnimation: boolean;
}

export interface HistoricalRecord {
  id: string;
  code: string;
  categoryName: string;
  categoryPrefix: string;
  waitTimeSec: number;
  serviceTimeSec: number;
  status: 'completed' | 'no_show';
  guicheNumber: number;
  attendantName: string;
  timestamp: number;
  rating?: number; // Simulated customer feedback
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'attendant' | 'supervisor';
  password?: string;
  guicheNumber?: number; // Option to preassign to a specific guiche
  isApproved?: boolean;
}

export interface MonthlyReportLog {
  id: string;
  protocol: string;
  generatedAt: number;
  generatedBy: string;
  monthKey: string; // e.g. "2026-09" or "all"
  monthLabel: string; // e.g. "Setembro / 2026"
  totalAttended: number;
  completedCount: number;
  noShowCount: number;
  avgWaitSec: number;
  avgWaitFormatted: string;
  avgServiceSec: number;
  avgServiceFormatted: string;
  slaWaitTargetMin: number;
  slaWaitCompliancePct: number;
  slaServiceTargetMin: number;
  slaServiceCompliancePct: number;
  satisfactionAvg?: string;
  monthlyEvolution?: {
    monthKey: string;
    monthLabel: string;
    total: number;
    completed: number;
    noShow: number;
    avgWaitFormatted: string;
    slaWaitCompliancePct: number;
    avgServiceFormatted: string;
    slaServiceCompliancePct: number;
  }[];
  categoryBreakdown: {
    name: string;
    prefix: string;
    total: number;
    completed: number;
    avgWaitFormatted: string;
    avgServiceFormatted: string;
    slaMetPct: number;
  }[];
  attendantBreakdown: {
    name: string;
    total: number;
    completedCount: number;
    avgServiceFormatted: string;
  }[];
  notes?: string;
}

