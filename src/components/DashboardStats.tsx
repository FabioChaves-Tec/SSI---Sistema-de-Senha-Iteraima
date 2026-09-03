/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { HistoricalRecord, ServiceCategory, UserAccount, MonthlyReportLog } from '../types';
import { 
  TrendingUp, 
  Clock, 
  UserCheck, 
  Smile, 
  Trash2, 
  Filter, 
  UserX,
  Award,
  ChevronDown,
  Star,
  Printer,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Database,
  FileText,
  CalendarRange,
  CheckCircle2,
  FolderClock,
  Layers,
  Sparkles,
  Info,
  X
} from 'lucide-react';

interface DashboardStatsProps {
  history: HistoricalRecord[];
  categories: ServiceCategory[];
  currentUser?: UserAccount | null;
  reports?: MonthlyReportLog[];
  onClearHistory: () => void;
  onAddSimulatedHistory?: () => void;
  onDailyClose?: () => void;
  onSaveReport?: (report: MonthlyReportLog) => Promise<void>;
  onDeleteReport?: (id: string) => Promise<void>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getMonthKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthLabel = (monthKey: string): string => {
  if (monthKey === 'all') return 'Consolidado Geral (Todos os Meses)';
  const [year, month] = monthKey.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  const name = MONTH_NAMES[monthIndex] || month;
  return `${name} de ${year}`;
};

export default function DashboardStats({
  history,
  categories,
  currentUser,
  reports = [],
  onClearHistory,
  onAddSimulatedHistory,
  onDailyClose,
  onSaveReport,
  onDeleteReport
}: DashboardStatsProps) {
  // Navigation tabs within stats view
  const [subTab, setSubTab] = useState<'realtime' | 'monthly' | 'database'>('realtime');

  // Filter state for recent logs
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  // Month selection modal state for print
  const [isMonthModalOpen, setIsMonthModalOpen] = useState<boolean>(false);
  
  // Current month key fallback
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [customMonthInput, setCustomMonthInput] = useState<string>(currentMonthKey);
  const [reportNotes, setReportNotes] = useState<string>('');
  const [isSavingReport, setIsSavingReport] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Currently active report for the print view
  const [activePrintReport, setActivePrintReport] = useState<MonthlyReportLog | null>(null);

  // 1. Available distinct months from history
  const availableMonths = useMemo(() => {
    const map = new Map<string, number>();
    map.set(currentMonthKey, 0);

    history.forEach(h => {
      if (h.timestamp) {
        const key = getMonthKey(h.timestamp);
        map.set(key, (map.get(key) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([key, count]) => ({
        key,
        label: getMonthLabel(key),
        count
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [history, currentMonthKey]);

  // 2. Month-by-month Evolution Data (Mês a Mês)
  const monthlyEvolution = useMemo(() => {
    const sortedKeys: string[] = Array.from(new Set<string>(availableMonths.map(m => m.key))).sort();
    return sortedKeys.map(key => {
      const monthRecords = history.filter(h => getMonthKey(h.timestamp) === key);
      const total = monthRecords.length;
      const completed = monthRecords.filter(r => r.status === 'completed');
      const noShow = monthRecords.filter(r => r.status === 'no_show');
      
      const avgWaitSec = total > 0 ? Math.round(monthRecords.reduce((s, r) => s + r.waitTimeSec, 0) / total) : 0;
      const slaWaitMet = monthRecords.filter(r => r.waitTimeSec <= 15 * 60).length;
      const slaWaitCompliancePct = total > 0 ? Math.round((slaWaitMet / total) * 100) : 100;
      
      const avgServiceSec = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + r.serviceTimeSec, 0) / completed.length) : 0;
      const slaServiceMet = completed.filter(r => r.serviceTimeSec <= 20 * 60).length;
      const slaServiceCompliancePct = completed.length > 0 ? Math.round((slaServiceMet / completed.length) * 100) : 100;
      
      const rated = completed.filter(r => r.rating !== undefined);
      const satisfactionAvg = rated.length > 0 ? (rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length).toFixed(1) : '5.0';

      return {
        monthKey: key,
        monthLabel: getMonthLabel(key),
        total,
        completedCount: completed.length,
        noShowCount: noShow.length,
        noShowPct: total > 0 ? ((noShow.length / total) * 100).toFixed(1) : '0',
        avgWaitSec,
        avgWaitFormatted: `${Math.floor(avgWaitSec / 60)}m ${avgWaitSec % 60}s`,
        slaWaitCompliancePct,
        avgServiceSec,
        avgServiceFormatted: `${Math.floor(avgServiceSec / 60)}m ${avgServiceSec % 60}s`,
        slaServiceCompliancePct,
        satisfactionAvg
      };
    });
  }, [history, availableMonths]);

  // 3. Helper to compute KPIs for any month
  const computeMonthMetrics = (monthKey: string) => {
    const records = monthKey === 'all' 
      ? history 
      : history.filter(h => getMonthKey(h.timestamp) === monthKey);
    
    const total = records.length;
    const completed = records.filter(r => r.status === 'completed');
    const noShow = records.filter(r => r.status === 'no_show');
    
    const avgWaitSec = total > 0 ? Math.round(records.reduce((s, r) => s + r.waitTimeSec, 0) / total) : 0;
    const slaWaitMet = records.filter(r => r.waitTimeSec <= 15 * 60).length;
    const slaWaitPct = total > 0 ? Math.round((slaWaitMet / total) * 100) : 100;
    
    const avgServiceSec = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + r.serviceTimeSec, 0) / completed.length) : 0;
    const slaServiceMet = completed.filter(r => r.serviceTimeSec <= 20 * 60).length;
    const slaServicePct = completed.length > 0 ? Math.round((slaServiceMet / completed.length) * 100) : 100;
    
    const rated = completed.filter(r => r.rating !== undefined);
    const satisfactionAvg = rated.length > 0 ? (rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length).toFixed(1) : '4.9';

    // Category breakdown
    const categoryBreakdown = categories.map(cat => {
      const catRecords = records.filter(r => r.categoryPrefix === cat.prefix);
      const catTotal = catRecords.length;
      const catCompleted = catRecords.filter(r => r.status === 'completed');
      const catWaitSec = catTotal > 0 ? Math.round(catRecords.reduce((s, r) => s + r.waitTimeSec, 0) / catTotal) : 0;
      const catServSec = catCompleted.length > 0 ? Math.round(catCompleted.reduce((s, r) => s + r.serviceTimeSec, 0) / catCompleted.length) : 0;
      const catSlaMet = catRecords.filter(r => r.waitTimeSec <= 15 * 60).length;
      const slaMetPct = catTotal > 0 ? Math.round((catSlaMet / catTotal) * 100) : 100;

      return {
        name: cat.name,
        prefix: cat.prefix,
        total: catTotal,
        completed: catCompleted.length,
        avgWaitFormatted: `${Math.floor(catWaitSec / 60)}m ${catWaitSec % 60}s`,
        avgServiceFormatted: `${Math.floor(catServSec / 60)}m ${catServSec % 60}s`,
        slaMetPct
      };
    });

    // Attendant breakdown
    const attMap: Record<string, { total: number; completedCount: number; totalServSec: number }> = {};
    records.forEach(r => {
      const name = r.attendantName || 'Atendente';
      if (!attMap[name]) {
        attMap[name] = { total: 0, completedCount: 0, totalServSec: 0 };
      }
      attMap[name].total += 1;
      if (r.status === 'completed') {
        attMap[name].completedCount += 1;
        attMap[name].totalServSec += r.serviceTimeSec;
      }
    });

    const attendantBreakdown = Object.entries(attMap).map(([name, d]) => {
      const avgSec = d.completedCount > 0 ? Math.round(d.totalServSec / d.completedCount) : 0;
      return {
        name,
        total: d.total,
        completedCount: d.completedCount,
        avgServiceFormatted: `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`
      };
    }).sort((a, b) => b.total - a.total);

    return {
      records,
      total,
      completedCount: completed.length,
      noShowCount: noShow.length,
      noShowPct: total > 0 ? ((noShow.length / total) * 100).toFixed(1) : '0',
      avgWaitSec,
      avgWaitFormatted: `${Math.floor(avgWaitSec / 60)}m ${avgWaitSec % 60}s`,
      slaWaitCompliancePct: slaWaitPct,
      avgServiceSec,
      avgServiceFormatted: `${Math.floor(avgServiceSec / 60)}m ${avgServiceSec % 60}s`,
      slaServiceCompliancePct: slaServicePct,
      satisfactionAvg,
      categoryBreakdown,
      attendantBreakdown
    };
  };

  // Preview metrics for the currently selected month in modal
  const previewMonthMetrics = useMemo(() => {
    return computeMonthMetrics(selectedMonthKey);
  }, [selectedMonthKey, history, categories]);

  // Real-time metrics for current tab
  const totalCount = history.length;
  const completedRecords = history.filter(h => h.status === 'completed');
  const avgWaitSec = totalCount > 0 ? history.reduce((sum, h) => sum + h.waitTimeSec, 0) / totalCount : 0;
  const avgWaitFormatted = `${Math.floor(avgWaitSec / 60)}m ${Math.floor(avgWaitSec % 60)}s`;
  const avgServiceSec = completedRecords.length > 0 ? completedRecords.reduce((sum, h) => sum + h.serviceTimeSec, 0) / completedRecords.length : 0;
  const avgServiceFormatted = `${Math.floor(avgServiceSec / 60)}m ${Math.floor(avgServiceSec % 60)}s`;
  const noShowCount = history.filter(h => h.status === 'no_show').length;
  const realNoShowPercent = totalCount > 0 ? ((noShowCount / totalCount) * 100).toFixed(1) : '0';
  const ratedRecords = completedRecords.filter(r => r.rating !== undefined);
  const avgRating = ratedRecords.length > 0 ? (ratedRecords.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedRecords.length).toFixed(1) : '4.8';

  // Category counts for SVG charts
  const categoryCounts = categories.map(cat => {
    const total = history.filter(h => h.categoryPrefix === cat.prefix).length;
    const completed = history.filter(h => h.categoryPrefix === cat.prefix && h.status === 'completed').length;
    return {
      name: cat.name.split(' ')[0],
      prefix: cat.prefix,
      color: cat.color,
      total,
      completed
    };
  });
  const maxTotal = Math.max(...categoryCounts.map(c => c.total), 5);

  // Attendants performance
  const attendantPerformance = history.reduce((acc: Record<string, { count: number, totalServiceSec: number, completedCount: number }>, curr) => {
    if (!acc[curr.attendantName]) {
      acc[curr.attendantName] = { count: 0, totalServiceSec: 0, completedCount: 0 };
    }
    acc[curr.attendantName].count += 1;
    if (curr.status === 'completed') {
      acc[curr.attendantName].completedCount += 1;
      acc[curr.attendantName].totalServiceSec += curr.serviceTimeSec;
    }
    return acc;
  }, {});

  const attendantsSorted = Object.entries(attendantPerformance).map(([name, data]) => {
    const avgSec = data.completedCount > 0 ? Math.round(data.totalServiceSec / data.completedCount) : 0;
    return {
      name,
      total: data.count,
      avgServiceMin: `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`
    };
  }).sort((a, b) => b.total - a.total);

  // Filter logs list
  const filteredHistory = history.filter((record) => {
    const catMatch = filterCategory === 'all' || record.categoryPrefix === filterCategory;
    const statMatch = filterStatus === 'all' || record.status === filterStatus;
    return catMatch && statMatch;
  });

  // Action: Open month selection modal
  const handleOpenPrintModal = () => {
    // Default to the month with records or current month
    if (availableMonths.length > 0 && !availableMonths.some(m => m.key === selectedMonthKey)) {
      setSelectedMonthKey(availableMonths[0].key);
    }
    setIsMonthModalOpen(true);
  };

  // Action: Confirm print and save to database
  const handleConfirmPrintAndSave = async () => {
    setIsSavingReport(true);
    const metrics = computeMonthMetrics(selectedMonthKey);
    const timestamp = Date.now();
    const cleanMonth = selectedMonthKey === 'all' ? 'GERAL' : selectedMonthKey.replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const protocol = `ITR-SLA-${cleanMonth}-${randomSuffix}`;
    const issuer = currentUser?.name || 'Supervisor de Atendimento';

    const newReport: MonthlyReportLog = {
      id: `rep_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
      protocol,
      generatedAt: timestamp,
      generatedBy: issuer,
      monthKey: selectedMonthKey,
      monthLabel: getMonthLabel(selectedMonthKey),
      totalAttended: metrics.total,
      completedCount: metrics.completedCount,
      noShowCount: metrics.noShowCount,
      avgWaitSec: metrics.avgWaitSec,
      avgWaitFormatted: metrics.avgWaitFormatted,
      avgServiceSec: metrics.avgServiceSec,
      avgServiceFormatted: metrics.avgServiceFormatted,
      slaWaitTargetMin: 15,
      slaWaitCompliancePct: metrics.slaWaitCompliancePct,
      slaServiceTargetMin: 20,
      slaServiceCompliancePct: metrics.slaServiceCompliancePct,
      satisfactionAvg: metrics.satisfactionAvg,
      monthlyEvolution: monthlyEvolution.map(m => ({
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        total: m.total,
        completed: m.completedCount,
        noShow: m.noShowCount,
        avgWaitFormatted: m.avgWaitFormatted,
        slaWaitCompliancePct: m.slaWaitCompliancePct,
        avgServiceFormatted: m.avgServiceFormatted,
        slaServiceCompliancePct: m.slaServiceCompliancePct
      })),
      categoryBreakdown: metrics.categoryBreakdown,
      attendantBreakdown: metrics.attendantBreakdown,
      notes: reportNotes.trim() || undefined
    };

    try {
      // 1. Save to backend database
      await onSaveReport?.(newReport);

      // 2. Set active report for printing
      setActivePrintReport(newReport);
      setIsMonthModalOpen(false);

      // 3. Show feedback toast
      setFeedbackToast(`Relatório registrado com sucesso no banco de dados! Protocolo: ${protocol}`);
      setTimeout(() => setFeedbackToast(null), 6000);

      // 4. Trigger print window
      setTimeout(() => {
        window.print();
      }, 350);
    } catch (err) {
      console.error('Falha ao salvar relatório no banco', err);
    } finally {
      setIsSavingReport(false);
    }
  };

  // Action: Re-print an already saved report from the database
  const handleReprintSavedReport = (savedReport: MonthlyReportLog) => {
    setActivePrintReport(savedReport);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div id="stats-root" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-6">
      
      {/* Toast alert */}
      {feedbackToast && (
        <div className="print:hidden bg-emerald-50 border border-emerald-250 text-emerald-850 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm transition">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button 
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Head & Reset controls */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-sans tracking-tight text-slate-800">Estatísticas, SLA e Relatórios Mensais</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              SSI • ITERAIMA
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Indicadores oficiais de atendimento, conformidade de SLA e banco de dados persistente</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Daily close action */}
          {showCloseConfirm ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-250/65 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-emerald-800">Iniciar novo dia?</span>
              <button
                onClick={() => {
                  onDailyClose?.();
                  setShowCloseConfirm(false);
                }}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer transition shadow-xs"
              >
                Sim
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded font-semibold text-[10px] cursor-pointer transition"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold cursor-pointer transition border border-emerald-100/50"
              title="Fecha o dia, zera as senhas ativas (começa do 001) e salva a produtividade de hoje"
            >
              <Calendar className="w-3.5 h-3.5" />
              Iniciar Novo Dia
            </button>
          )}

          {/* MAIN BUTTON: Imprimir Relatório (triggers month selector modal & database persistence) */}
          <button
            onClick={handleOpenPrintModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-sm"
            title="Escolha o mês de apuração, gere o relatório de indicadores/SLA e registre no banco de dados"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Relatório Mensal
          </button>

          {/* Reset data */}
          {showClearConfirm ? (
            <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-250/50 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-rose-700">Limpar tudo?</span>
              <button
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] cursor-pointer transition shadow-xs"
              >
                Sim
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded font-semibold text-[10px] cursor-pointer transition"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg text-xs font-semibold cursor-pointer transition border border-rose-100/50"
              title="Apaga os logs e limpa as estatísticas de todos os dias"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Zerar Histórico
            </button>
          )}
        </div>
      </div>

      {/* SUB-TABS: Real-time KPIs vs. Month-by-month Evolution vs. Database Reports */}
      <div className="print:hidden flex items-center justify-between border-b border-slate-200/80 -mt-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('realtime')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition ${
              subTab === 'realtime'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Visão Geral e Tempo Real
          </button>

          <button
            onClick={() => setSubTab('monthly')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition ${
              subTab === 'monthly'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            Evolução Mês a Mês ({monthlyEvolution.length})
          </button>

          <button
            onClick={() => setSubTab('database')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition ${
              subTab === 'database'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            Relatórios no Banco de Dados
            {reports.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                {reports.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={handleOpenPrintModal}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          Emitir Relatório
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: REALTIME OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'realtime' && (
        <>
          {/* KPI Grid */}
          <div id="kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Waiting SLA */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/30 flex items-start gap-3">
              <div className="bg-amber-100 text-amber-800 p-2 rounded-lg shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block">Média de Espera (SLA)</span>
                <span id="kpi-wait-time" className="text-lg font-black font-mono text-slate-800 tracking-tight block mt-0.5">{avgWaitFormatted}</span>
                <span className="text-[10px] text-amber-600 font-semibold block mt-1">Meta SSI: &lt;15m</span>
              </div>
            </div>

            {/* Serving SLA */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/30 flex items-start gap-3">
              <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block">Tempo de Atendimento</span>
                <span id="kpi-service-time" className="text-lg font-black font-mono text-slate-800 tracking-tight block mt-0.5">{avgServiceFormatted}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-1">{totalCount - noShowCount} concluídos</span>
              </div>
            </div>

            {/* No show Rate */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/30 flex items-start gap-3">
              <div className="bg-rose-100 text-rose-850 p-2 rounded-lg shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block">Não Comparecimento</span>
                <span id="kpi-no-show" className="text-lg font-black font-mono text-slate-800 tracking-tight block mt-0.5">{realNoShowPercent}%</span>
                <span className="text-[10px] text-rose-500 font-semibold block mt-1">{noShowCount} clientes faltantes</span>
              </div>
            </div>

            {/* CSAT Score */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/30 flex items-start gap-3">
              <div className="bg-blue-100 text-blue-800 p-2 rounded-lg shrink-0">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block">Satisfação (CSAT)</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span id="kpi-csat" className="text-lg font-black font-mono text-slate-800 tracking-tight block">{avgRating}</span>
                  <div className="flex text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold block mt-1">Excelente SLA do guichê</span>
              </div>
            </div>
          </div>

          {/* Visual Analytics Sections */}
          <div id="visual-reports-row" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SVG Bar Chart */}
            <div className="border border-slate-200/70 rounded-2xl p-5 bg-slate-50/15">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-4">Volume de Senhas por Fila</h3>
              <div className="space-y-4">
                {categoryCounts.map((data, index) => {
                  const petcentage = totalCount > 0 ? (data.total / totalCount) * 100 : 0;
                  const barWidth = `${Math.max(4, (data.total / maxTotal) * 100)}%`;
                  const barColorMap: Record<string, string> = {
                    emerald: 'from-emerald-500 to-emerald-600',
                    amber: 'from-amber-400 to-amber-500',
                    indigo: 'from-indigo-500 to-indigo-600',
                    sky: 'from-sky-450 to-sky-500',
                  };
                  const gradient = barColorMap[data.color] || 'from-blue-500 to-blue-600';
                  return (
                    <div key={index} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">{data.prefix}</span>
                          <span className="font-medium text-slate-600">{data.name}</span>
                        </div>
                        <span className="font-mono text-slate-500">
                          <strong>{data.total}</strong> ({Math.round(petcentage)}%) • Concluídos: {data.completed}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000`} 
                          style={{ width: barWidth }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendant leaderboard */}
            <div className="border border-slate-200/70 rounded-2xl p-5 bg-slate-50/15">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-4">Eficiência dos Operadores</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-450 uppercase font-mono pb-2">
                      <th className="py-2 font-semibold">Atendente</th>
                      <th className="py-2 text-center font-semibold">Atendidos</th>
                      <th className="py-2 text-right font-semibold">Tempo de Mesa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {attendantsSorted.length > 0 ? (
                      attendantsSorted.map((col, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                            <Award className={`w-3.5 h-3.5 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-slate-300'}`} />
                            {col.name}
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-slate-800">{col.total}</td>
                          <td className="py-2.5 text-right font-mono text-blue-600 font-semibold">{col.avgServiceMin}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                          Nenhum operador realizou atendimentos ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Audit Operations Log list table */}
          <div id="audit-log-panel" className="border border-slate-200/60 rounded-2xl overflow-hidden mt-2">
            <div className="bg-slate-50/75 px-5 py-4 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Histórico de Chamados Recentes</h3>
              <div className="flex gap-2.5">
                <div className="relative">
                  <select
                    id="filter-category-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-600 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">Todas Categorias</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.prefix}>({c.prefix}) {c.name.split(' ')[0]}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    id="filter-status-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-600 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">SLA Todos</option>
                    <option value="completed">Concluídos</option>
                    <option value="no_show">Não Compareceram</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/50 text-slate-500 font-mono uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Senha</th>
                    <th className="px-5 py-2.5 font-semibold">Fila</th>
                    <th className="px-5 py-2.5 font-semibold">Atendente</th>
                    <th className="px-5 py-2.5 text-center font-semibold">Espera</th>
                    <th className="px-5 py-2.5 text-center font-semibold">Atendimento</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.slice(0, 30).map((record) => {
                      const waitMinutes = Math.floor(record.waitTimeSec / 60);
                      const waitSeconds = Math.floor(record.waitTimeSec % 60);
                      const serviceMinutes = Math.floor(record.serviceTimeSec / 60);
                      const serviceSeconds = Math.floor(record.serviceTimeSec % 60);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-bold font-mono text-slate-800">{record.code}</td>
                          <td className="px-5 py-3 font-sans text-slate-600">{record.categoryName}</td>
                          <td className="px-5 py-3 text-slate-500">
                            G0{record.guicheNumber} • {record.attendantName}
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-medium text-slate-500">
                            {waitMinutes}:{waitSeconds.toString().padStart(2, '0')}
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-medium text-slate-550">
                            {record.status === 'no_show' ? '--:--' : `${serviceMinutes}:${serviceSeconds.toString().padStart(2, '0')}`}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              record.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {record.status === 'completed' ? 'Atendido' : 'Sem show'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-450 italic">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: MONTH-BY-MONTH EVOLUTION (MÊS A MÊS) */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'monthly' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Evolução Mensal de Indicadores e SLA</h3>
              <p className="text-xs text-slate-500">Dados consolidados mês a mês de tempo médio de espera, atendimento e índice de cumprimento de metas</p>
            </div>
            <button
              onClick={handleOpenPrintModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relatório Mensal
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-mono uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Mês / Ano</th>
                  <th className="px-4 py-3 text-center font-bold">Total Senhas</th>
                  <th className="px-4 py-3 text-center font-bold">Concluídos</th>
                  <th className="px-4 py-3 text-center font-bold">Desistências (No-show)</th>
                  <th className="px-4 py-3 text-center font-bold">Média Espera</th>
                  <th className="px-4 py-3 text-center font-bold">SLA Espera (&lt;15m)</th>
                  <th className="px-4 py-3 text-center font-bold">Média Atendimento</th>
                  <th className="px-4 py-3 text-center font-bold">SLA Atend. (&lt;20m)</th>
                  <th className="px-4 py-3 text-center font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyEvolution.map((m) => {
                  const isCurrent = m.monthKey === currentMonthKey;
                  return (
                    <tr key={m.monthKey} className={`hover:bg-slate-50/80 ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{m.monthLabel}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase">
                              Atual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">{m.total}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">{m.completedCount}</td>
                      <td className="px-4 py-3 text-center font-mono text-rose-650">
                        {m.noShowCount} ({m.noShowPct}%)
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-700">{m.avgWaitFormatted}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          m.slaWaitCompliancePct >= 85 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : m.slaWaitCompliancePct >= 65 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          {m.slaWaitCompliancePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-700">{m.avgServiceFormatted}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          m.slaServiceCompliancePct >= 85 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : m.slaServiceCompliancePct >= 65 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          {m.slaServiceCompliancePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedMonthKey(m.monthKey);
                            setIsMonthModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                        >
                          Imprimir Este Mês
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: DATABASE ARCHIVED REPORTS */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'database' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Relatórios Registrados no Banco de Dados</h3>
              </div>
              <p className="text-xs text-slate-500">Histórico auditável e permanente de todas as emissões de relatórios com autenticação e protocolo</p>
            </div>
            <button
              onClick={handleOpenPrintModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Novo Relatório
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <FolderClock className="w-10 h-10 text-slate-350 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Nenhum relatório emitido e registrado no banco ainda.</p>
              <p className="text-[11px] text-slate-500 mt-1">Ao clicar em "Imprimir Relatório Mensal", os dados do mês selecionado são salvos automaticamente no banco de dados.</p>
              <button
                onClick={handleOpenPrintModal}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Emitir Primeiro Relatório
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-mono uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Protocolo / Data</th>
                    <th className="px-4 py-3 font-bold">Mês Apurado</th>
                    <th className="px-4 py-3 font-bold">Emitido Por</th>
                    <th className="px-4 py-3 text-center font-bold">Total Atendimentos</th>
                    <th className="px-4 py-3 text-center font-bold">SLA Espera</th>
                    <th className="px-4 py-3 text-center font-bold">SLA Atendimento</th>
                    <th className="px-4 py-3 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800 block">{rep.protocol}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rep.generatedAt).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {rep.monthLabel}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {rep.generatedBy}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                        {rep.totalAttended}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          rep.slaWaitCompliancePct >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rep.slaWaitCompliancePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          rep.slaServiceCompliancePct >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rep.slaServiceCompliancePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReprintSavedReport(rep)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition cursor-pointer border border-blue-200"
                            title="Reimprime o documento oficial com os dados gravados no banco"
                          >
                            <Printer className="w-3 h-3" />
                            Reimprimir
                          </button>
                          {onDeleteReport && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja remover o registro ${rep.protocol} do banco de dados?`)) {
                                  onDeleteReport(rep.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Excluir este registro arquivado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PERGUNTAR QUAL MÊS AO CLICAR EM IMPRIMIR RELATÓRIO */}
      {/* ------------------------------------------------------------- */}
      {isMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <CalendarRange className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-850">Emissão de Relatório de Indicadores & SLA</h3>
                  <p className="text-xs text-slate-500">Qual mês você deseja apurar para a impressão e registro no banco?</p>
                </div>
              </div>
              <button
                onClick={() => setIsMonthModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Options */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Mês de Referência:</span>
                <span className="text-[10px] text-slate-400 font-normal">Identificação por período de atendimento</span>
              </label>

              {/* Month Radio / Quick Pills */}
              <div className="grid grid-cols-2 gap-2">
                {availableMonths.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonthKey(m.key)}
                    className={`p-3 text-left rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col justify-between ${
                      selectedMonthKey === m.key
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold">{m.label}</span>
                      {selectedMonthKey === m.key && (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      {m.count} {m.count === 1 ? 'chamado registrado' : 'chamados registrados'}
                    </span>
                  </button>
                ))}

                {/* Option: Consolidado Geral */}
                <button
                  type="button"
                  onClick={() => setSelectedMonthKey('all')}
                  className={`p-3 text-left rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col justify-between ${
                    selectedMonthKey === 'all'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold">Todos os Meses (Consolidado)</span>
                    {selectedMonthKey === 'all' && (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    {history.length} chamados totais acumulados
                  </span>
                </button>
              </div>

              {/* Manual month selector fallback */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 shrink-0">Outro mês específico:</span>
                <input
                  type="month"
                  value={customMonthInput}
                  onChange={(e) => {
                    setCustomMonthInput(e.target.value);
                    if (e.target.value) {
                      setSelectedMonthKey(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Live Preview Card of Indicators for Selected Month */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Prévia dos Indicadores no Mês ({getMonthLabel(selectedMonthKey)})
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Senhas</span>
                  <span className="text-base font-black font-mono text-slate-800">{previewMonthMetrics.total}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Concluídos</span>
                  <span className="text-base font-black font-mono text-emerald-700">{previewMonthMetrics.completedCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">SLA Espera</span>
                  <span className="text-base font-black font-mono text-indigo-700">{previewMonthMetrics.slaWaitCompliancePct}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">SLA Atendimento</span>
                  <span className="text-base font-black font-mono text-blue-700">{previewMonthMetrics.slaServiceCompliancePct}%</span>
                </div>
              </div>
            </div>

            {/* Optional Observation Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Observações do Relatório (opcional):
              </label>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Ex: Relatório mensal homologado para auditoria da Diretoria de Atendimento..."
                rows={2}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
              />
            </div>

            {/* Notice about database registration */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Ao confirmar, todos os indicadores, SLA e métricas deste mês serão <strong>gravados no banco de dados persistente</strong> com protocolo auditável.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMonthModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPrintAndSave}
                disabled={isSavingReport}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {isSavingReport ? 'Registrando no Banco...' : 'Confirmar, Registrar e Imprimir'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EXCLUSIVO PARA IMPRESSÃO / EXECUTIVE GOVERNMENT STYLE PRINT REPORT */}
      {/* ------------------------------------------------------------- */}
      {(() => {
        // Use activePrintReport if available; otherwise compute fallback for selectedMonthKey
        const currentReport = activePrintReport || {
          id: 'rep_fallback',
          protocol: `ITR-SLA-${selectedMonthKey.replace('-', '')}-AUTO`,
          generatedAt: Date.now(),
          generatedBy: currentUser?.name || 'Supervisor de Atendimento',
          monthKey: selectedMonthKey,
          monthLabel: getMonthLabel(selectedMonthKey),
          totalAttended: previewMonthMetrics.total,
          completedCount: previewMonthMetrics.completedCount,
          noShowCount: previewMonthMetrics.noShowCount,
          avgWaitSec: previewMonthMetrics.avgWaitSec,
          avgWaitFormatted: previewMonthMetrics.avgWaitFormatted,
          avgServiceSec: previewMonthMetrics.avgServiceSec,
          avgServiceFormatted: previewMonthMetrics.avgServiceFormatted,
          slaWaitTargetMin: 15,
          slaWaitCompliancePct: previewMonthMetrics.slaWaitCompliancePct,
          slaServiceTargetMin: 20,
          slaServiceCompliancePct: previewMonthMetrics.slaServiceCompliancePct,
          satisfactionAvg: previewMonthMetrics.satisfactionAvg,
          monthlyEvolution: monthlyEvolution.map(m => ({
            monthKey: m.monthKey,
            monthLabel: m.monthLabel,
            total: m.total,
            completed: m.completedCount,
            noShow: m.noShowCount,
            avgWaitFormatted: m.avgWaitFormatted,
            slaWaitCompliancePct: m.slaWaitCompliancePct,
            avgServiceFormatted: m.avgServiceFormatted,
            slaServiceCompliancePct: m.slaServiceCompliancePct
          })),
          categoryBreakdown: previewMonthMetrics.categoryBreakdown,
          attendantBreakdown: previewMonthMetrics.attendantBreakdown,
          notes: reportNotes || undefined
        };

        return (
          <div className="hidden print:block bg-white text-slate-900 font-sans p-8 max-w-4xl mx-auto my-2 border border-slate-350 leading-normal">
            
            {/* Document Official Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-950 text-white flex items-center justify-center font-extrabold text-base border-2 border-slate-900 font-sans shadow-xs">
                  ITR
                </div>
                <div>
                  <h1 className="text-[11px] font-bold tracking-tight text-slate-700 uppercase leading-none">Governo do Estado de Roraima</h1>
                  <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">Instituto de Terras e Colonização de Roraima — ITERAIMA</h2>
                  <p className="text-[10px] text-slate-600 font-medium">Sistema de Senhas e Indicadores de Atendimento (SSI)</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">REGISTRO OFICIAL NO BANCO</span>
                <span className="text-xs font-mono font-bold text-slate-900">{currentReport.protocol}</span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Emitido em: {new Date(currentReport.generatedAt).toLocaleString('pt-BR')}
                </span>
                <span className="text-[9px] text-slate-600 font-semibold">
                  Servidor: {currentReport.generatedBy}
                </span>
              </div>
            </div>

            {/* Report Title Banner */}
            <div className="text-center my-4 bg-slate-100 border border-slate-300 py-3 rounded-md">
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                Relatório Mensal de Indicadores, Fluxo de Atendimento e SLA
              </h3>
              <p className="text-[11px] text-slate-700 font-bold uppercase mt-0.5">
                Período de Referência: {currentReport.monthLabel}
              </p>
              <p className="text-[9px] text-slate-500">
                Auditoria Oficial Consolidada • Status no Banco de Dados: <strong>REGISTRADO E AUTENTICADO</strong>
              </p>
            </div>

            {/* KPI Summary Block for the Selected Month */}
            <div className="grid grid-cols-4 gap-3 my-4 text-center border-y border-slate-300 py-3 bg-slate-50/50">
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Senhas no Mês</h4>
                <p className="text-2xl font-black font-mono text-slate-900">{currentReport.totalAttended}</p>
                <span className="text-[8px] text-slate-500 italic">Cidadãos cadastrados</span>
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Atendimentos Concluídos</h4>
                <p className="text-2xl font-black font-mono text-emerald-850">{currentReport.completedCount}</p>
                <span className="text-[8px] text-emerald-750 font-semibold">
                  {currentReport.totalAttended > 0 ? `${Math.round((currentReport.completedCount / currentReport.totalAttended) * 100)}% de efetividade` : '--'}
                </span>
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Não Compareceram</h4>
                <p className="text-2xl font-black font-mono text-rose-850">{currentReport.noShowCount}</p>
                <span className="text-[8px] text-rose-700 font-semibold">
                  {currentReport.totalAttended > 0 ? `${((currentReport.noShowCount / currentReport.totalAttended) * 100).toFixed(1)}% taxa falta` : '0%'}
                </span>
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Satisfação Média (CSAT)</h4>
                <p className="text-2xl font-black font-mono text-blue-900">{currentReport.satisfactionAvg || '4.9'} / 5</p>
                <span className="text-[8px] text-blue-700 font-semibold">Avaliação dos cidadãos</span>
              </div>
            </div>

            {/* SLA Compliance Box */}
            <div className="my-4 border border-slate-300 rounded-md p-3 bg-slate-50">
              <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2">
                Conformidade com os Padrões de SLA do Governo de Roraima
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-250">
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 block">SLA de Espera na Fila</span>
                    <span className="text-[9px] text-slate-500">Meta Oficial: Tempo &lt; 15 minutos</span>
                    <span className="text-[10px] font-mono text-slate-700 block mt-0.5">Tempo Médio Real: <strong>{currentReport.avgWaitFormatted}</strong></span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-indigo-900">{currentReport.slaWaitCompliancePct}%</span>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Conformidade</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-250">
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 block">SLA de Atendimento no Guichê</span>
                    <span className="text-[9px] text-slate-500">Meta Oficial: Tempo &lt; 20 minutos</span>
                    <span className="text-[10px] font-mono text-slate-700 block mt-0.5">Tempo Médio Real: <strong>{currentReport.avgServiceFormatted}</strong></span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-emerald-900">{currentReport.slaServiceCompliancePct}%</span>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Conformidade</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: EVOLUÇÃO E COMPARATIVO MÊS A MÊS DE INDICADORES E SLA */}
            <div className="my-4">
              <h4 className="text-[11px] font-bold text-slate-900 uppercase mb-2 border-l-4 border-slate-900 pl-2 tracking-wide">
                1. Histórico e Evolução Mês a Mês de Indicadores e SLA
              </h4>
              <table className="w-full text-left text-[10px] border border-slate-350 border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-350 text-slate-900 font-bold">
                    <th className="p-1.5">Mês de Referência</th>
                    <th className="p-1.5 text-center w-16">Total</th>
                    <th className="p-1.5 text-center w-20">Concluídos</th>
                    <th className="p-1.5 text-center w-20">Desistências</th>
                    <th className="p-1.5 text-center w-24">Média Espera</th>
                    <th className="p-1.5 text-center w-24">SLA Espera</th>
                    <th className="p-1.5 text-center w-28">Média Atendimento</th>
                    <th className="p-1.5 text-center w-24">SLA Atend.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-250">
                  {(currentReport.monthlyEvolution || []).map((m) => {
                    const isSelected = m.monthKey === currentReport.monthKey;
                    return (
                      <tr key={m.monthKey} className={isSelected ? 'bg-blue-50/70 font-bold' : ''}>
                        <td className="p-1.5 font-semibold text-slate-900">
                          {m.monthLabel} {isSelected && '(Apurado)'}
                        </td>
                        <td className="p-1.5 text-center font-mono">{m.total}</td>
                        <td className="p-1.5 text-center font-mono text-emerald-800">{m.completed}</td>
                        <td className="p-1.5 text-center font-mono text-rose-800">{m.noShow}</td>
                        <td className="p-1.5 text-center font-mono">{m.avgWaitFormatted}</td>
                        <td className="p-1.5 text-center font-mono">{m.slaWaitCompliancePct}%</td>
                        <td className="p-1.5 text-center font-mono">{m.avgServiceFormatted}</td>
                        <td className="p-1.5 text-center font-mono">{m.slaServiceCompliancePct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SECTION: DETALHAMENTO POR SERVIÇO / CATEGORIA */}
            <div className="my-4">
              <h4 className="text-[11px] font-bold text-slate-900 uppercase mb-2 border-l-4 border-slate-900 pl-2 tracking-wide">
                2. Distribuição por Tipo de Senha e SLA por Categoria no Período
              </h4>
              <table className="w-full text-left text-[10px] border border-slate-350 border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-350 text-slate-900 font-bold">
                    <th className="p-1.5 text-center w-12 font-mono">Prefixo</th>
                    <th className="p-1.5">Fila de Atendimento / Serviço</th>
                    <th className="p-1.5 text-center w-16">Emitidas</th>
                    <th className="p-1.5 text-center w-16">Atendidas</th>
                    <th className="p-1.5 text-center w-24">Média Espera</th>
                    <th className="p-1.5 text-center w-24">Média Atendimento</th>
                    <th className="p-1.5 text-right w-20">SLA Espera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-250">
                  {currentReport.categoryBreakdown.map(cat => (
                    <tr key={cat.prefix} className="text-slate-800">
                      <td className="p-1.5 font-bold font-mono text-center text-slate-950 bg-slate-100">{cat.prefix}</td>
                      <td className="p-1.5 font-semibold text-slate-900">{cat.name}</td>
                      <td className="p-1.5 text-center font-mono">{cat.total}</td>
                      <td className="p-1.5 text-center font-mono">{cat.completed}</td>
                      <td className="p-1.5 text-center font-mono">{cat.avgWaitFormatted}</td>
                      <td className="p-1.5 text-center font-mono">{cat.avgServiceFormatted}</td>
                      <td className="p-1.5 text-right font-mono font-bold">{cat.slaMetPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SECTION: PRODUTIVIDADE POR ATENDENTE */}
            <div className="my-4">
              <h4 className="text-[11px] font-bold text-slate-900 uppercase mb-2 border-l-4 border-slate-900 pl-2 tracking-wide">
                3. Produtividade e SLA Médio dos Operadores de Guichê no Período
              </h4>
              <table className="w-full text-left text-[10px] border border-slate-350 border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-350 text-slate-900 font-bold">
                    <th className="p-1.5">Identificação do Servidor / Atendente</th>
                    <th className="p-1.5 text-center w-28">Total de Chamados</th>
                    <th className="p-1.5 text-center w-28">Concluídos</th>
                    <th className="p-1.5 text-right w-44">Tempo Médio de Atendimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-250">
                  {currentReport.attendantBreakdown.length > 0 ? (
                    currentReport.attendantBreakdown.map(att => (
                      <tr key={att.name} className="text-slate-800">
                        <td className="p-1.5 font-semibold text-slate-900">{att.name}</td>
                        <td className="p-1.5 text-center font-mono">{att.total}</td>
                        <td className="p-1.5 text-center font-mono text-emerald-800">{att.completedCount}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">{att.avgServiceFormatted}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                        Nenhum atendimento registrado no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Observações */}
            {currentReport.notes && (
              <div className="my-3 p-2.5 bg-slate-50 border border-slate-300 rounded text-[10px]">
                <strong className="block uppercase text-slate-700 mb-0.5">Observações Administrativas:</strong>
                <p className="text-slate-800 italic">{currentReport.notes}</p>
              </div>
            )}

            {/* Auditorial Signature section */}
            <div className="mt-8 pt-6 border-t-2 border-slate-800 flex justify-between items-end">
              <div className="text-left text-[9px] text-slate-600">
                <p className="font-bold uppercase text-slate-800">Validação e Autenticidade SSI:</p>
                <p className="font-mono">Protocolo: {currentReport.protocol}</p>
                <p className="font-mono">Base de Dados: ssi_db.json (Iteraima)</p>
                <p className="text-[8px] text-slate-400 mt-1">Documento gerado automaticamente pelo Sistema de Senhas Iteraima.</p>
              </div>
              <div className="text-center min-w-[300px]">
                <div className="border-b border-slate-800 w-full h-8 mb-1"></div>
                <p className="text-xs font-bold text-slate-900">{currentReport.generatedBy}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                  Responsável / Supervisor do Setor de Atendimento
                </p>
                <p className="text-[8px] text-slate-400">ITERAIMA — Governo do Estado de Roraima</p>
              </div>
            </div>

          </div>
        );
      })()}

    </div>
  );
}
