/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Guiche, Ticket, ServiceCategory } from '../types';
import { 
  Play, 
  Power, 
  PhoneCall, 
  CheckSquare, 
  XSquare, 
  RefreshCw, 
  Settings, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface DeskOperatorProps {
  guiches: Guiche[];
  waitingTickets: Ticket[];
  categories: ServiceCategory[];
  onToggleOnline: (guicheId: string) => void;
  onCallNext: (guicheId: string) => Ticket | null;
  onRecall: (guicheId: string) => void;
  onStartService: (guicheId: string) => void;
  onCompleteService: (guicheId: string, rating: number) => void;
  onNoShow: (guicheId: string) => void;
  onTransferTicket: (guicheId: string, targetCategoryId: string) => void;
  onToggleCategoryFocus: (guicheId: string, categoryId: string) => void;
}

export default function DeskOperator({
  guiches,
  waitingTickets,
  categories,
  onToggleOnline,
  onCallNext,
  onRecall,
  onStartService,
  onCompleteService,
  onNoShow,
  onTransferTicket,
  onToggleCategoryFocus,
}: DeskOperatorProps) {
  // Local state to keep track of active guiche selection (for pilot desk simulation) or view all mode
  const [selectedGuicheId, setSelectedGuicheId] = useState<string>('all');
  const [transferTargetId, setTransferTargetId] = useState<Record<string, string>>({});
  const [deskTimers, setDeskTimers] = useState<Record<string, string>>({});

  // Trigger timer updates for desks currently "serving" a client
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, string> = {};

      guiches.forEach((guiche) => {
        if (guiche.status === 'serving' && guiche.currentTicket?.servingStartedAt) {
          const secs = Math.floor((now - guiche.currentTicket.servingStartedAt) / 1000);
          const mins = Math.floor(secs / 60);
          const remainSecs = secs % 60;
          newTimers[guiche.id] = `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
        } else if (guiche.status === 'calling' && guiche.currentTicket?.calledAt) {
          const secs = Math.floor((now - guiche.currentTicket.calledAt) / 1000);
          newTimers[guiche.id] = `Chamando (${secs}s)`;
        } else {
          newTimers[guiche.id] = '--:--';
        }
      });

      setDeskTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [guiches]);

  const visibleDesks = selectedGuicheId === 'all' 
    ? guiches 
    : guiches.filter(g => g.id === selectedGuicheId);

  return (
    <div id="operator-root" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col h-full gap-5">
      
      {/* Header & Controls of simulator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans tracking-tight text-slate-800">Controle de Atendimento</h2>
            <p className="text-xs text-slate-500">PAINEL OPERACIONAL DE GUICHÊS (MESA E CLIENTE)</p>
          </div>
        </div>

        {/* Filter Guiches Tabs */}
        <div id="desk-selection-row" className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto shrink-0 border border-slate-200/50">
          <button
            onClick={() => setSelectedGuicheId('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${selectedGuicheId === 'all' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Todos Guichês
          </button>
          {guiches.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGuicheId(g.id)}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${selectedGuicheId === g.id ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              G0{g.number}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Virtual Desks */}
      <div id="desks-grid" className={`grid gap-5 ${selectedGuicheId === 'all' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {visibleDesks.map((desk) => {
          const isOnline = desk.status !== 'offline';
          const currentTicket = desk.currentTicket;
          
          return (
            <div
              id={`desk-card-G0${desk.number}`}
              key={desk.id}
              className={`border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                !isOnline 
                  ? 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-75' 
                  : desk.status === 'calling'
                  ? 'bg-blue-50/20 border-blue-200 shadow-md ring-1 ring-blue-100'
                  : desk.status === 'serving'
                  ? 'bg-emerald-50/10 border-emerald-200 shadow-sm'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              {/* Card Header: Desks name, status indicator, action login button */}
              <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    !isOnline 
                      ? 'bg-slate-200 text-slate-500' 
                      : desk.status === 'calling'
                      ? 'bg-blue-600 text-white animate-pulse'
                      : desk.status === 'serving'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-white'
                  }`}>
                    {desk.number}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Guichê 0{desk.number}
                      <span className={`h-2 w-2 rounded-full ${
                        !isOnline ? 'bg-slate-300' : desk.status === 'idle' ? 'bg-green-500' : desk.status === 'calling' ? 'bg-blue-500 animate-ping' : 'bg-orange-500'
                      }`}></span>
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      {desk.attendantName || 'Aguardando operador'}
                    </p>
                  </div>
                </div>

                {/* Desk Online toggle */}
                <button
                  id={`online-toggle-${desk.id}`}
                  onClick={() => onToggleOnline(desk.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    isOnline 
                      ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-100'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {isOnline ? 'Sair' : 'Entrar'}
                </button>
              </div>

              {/* Desk Body states and interactive calling controls */}
              {isOnline ? (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Category Selection Filters (Toggle what categories this attendant accepts) */}
                  <div id="categories-filter" className="mb-4">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-2">Especialidades do Atendente:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => {
                        const isFocused = desk.categoryFocus.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => onToggleCategoryFocus(desk.id, cat.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                              isFocused 
                                ? 'bg-slate-800 text-white shadow-xs border border-slate-800' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 border border-slate-200/50'
                            }`}
                          >
                            {cat.prefix} • {cat.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Service Status panel */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/40 mb-4 flex-1 flex flex-col justify-center">
                    {desk.status === 'idle' ? (
                      <div className="text-center py-4 text-slate-400 flex flex-col items-center">
                        <UserCheck className="w-8 h-8 text-slate-300 stroke-[1.2] mb-1.5" />
                        <p className="text-xs font-semibold uppercase text-emerald-600/90 tracking-wider">Disponível para Chamadas</p>
                        <p className="text-[11px] text-slate-500 mt-1">Aguardando clientes na fila inteligente.</p>
                      </div>
                    ) : currentTicket ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-black font-mono tracking-tight text-slate-800">
                              {currentTicket.code}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${currentTicket.category.bgLight}`}>
                              {currentTicket.category.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Espera: <strong className="text-slate-700">{Math.floor((currentTicket.calledAt! - currentTicket.createdAt) / 1000 / 60)} min</strong>
                            </span>
                            
                            <span className="h-3 w-px bg-slate-200" />
                            
                            <span className="flex items-center gap-1 uppercase tracking-wider text-[11px]">
                              Status: <strong className={desk.status === 'calling' ? 'text-blue-600 font-bold' : 'text-emerald-600 font-bold'}>{desk.status === 'calling' ? 'Chamando...' : 'Atendendo'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Chronometer of the active Desk */}
                        <div className="text-right shrink-0 bg-slate-800 text-white rounded-lg px-3 py-1.5 border border-slate-700 flex flex-col items-end">
                          <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">Tempo</span>
                          <span className="text-sm font-mono font-bold tracking-tight text-emerald-400">
                            {deskTimers[desk.id] || '00:00'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-rose-500 font-mono text-xs flex items-center justify-center gap-1 bg-rose-50 rounded-xl border border-rose-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Controle de estado inconsistente. Redefinindo...</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Call Controls */}
                  <div id="desk-operational-actions" className="flex flex-col gap-2.5">
                    {/* Idle state actions */}
                    {desk.status === 'idle' && (
                      <button
                        id={`call-next-${desk.id}`}
                        onClick={() => onCallNext(desk.id)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-sm active:scale-98 cursor-pointer"
                        title="Chama a senha com maior tempo de resposta ou prioridade"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Chamar Próximo na Fila
                      </button>
                    )}

                    {/* Calling state actions */}
                    {desk.status === 'calling' && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Recall */}
                        <button
                          id={`recall-ticket-${desk.id}`}
                          onClick={() => onRecall(desk.id)}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-xl transition active:scale-97 cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          Chamar Novamente
                        </button>

                        {/* Start service */}
                        <button
                          id={`start-service-${desk.id}`}
                          onClick={() => onStartService(desk.id)}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm active:scale-97 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white text-emerald-600" />
                          Iniciar Atendimento
                        </button>
                      </div>
                    )}

                    {/* Serving state actions */}
                    {desk.status === 'serving' && (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Absent No-Show */}
                          <button
                            id={`absent-ticket-${desk.id}`}
                            onClick={() => onNoShow(desk.id)}
                            className="flex items-center justify-center gap-1.5 py-2 hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-transparent hover:border-rose-200 font-medium text-xs rounded-xl transition cursor-pointer"
                            title="Marca que o cliente não compareceu ao atendimento"
                          >
                            <XSquare className="w-3.5 h-3.5" />
                            Não Compareceu
                          </button>

                          {/* Complete service */}
                          <button
                            id={`complete-service-${desk.id}`}
                            onClick={() => onCompleteService(desk.id, 5)} // default 5 star feedback
                            className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-97 cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Concluir Serviço
                          </button>
                        </div>

                        {/* Transfer sub-drawer */}
                        <div className="border-t border-slate-100 pt-3.5 mt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                            <span className="font-semibold uppercase tracking-wider font-mono">Transferir Senha</span>
                            <span>Mudar de fila</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <select
                              id={`transfer-select-${desk.id}`}
                              value={transferTargetId[desk.id] || ''}
                              onChange={(e) => setTransferTargetId(prev => ({...prev, [desk.id]: e.target.value}))}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            >
                              <option value="">Selecione a fila de destino...</option>
                              {categories
                                .filter(cat => cat.id !== currentTicket?.category.id)
                                .map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.prefix} - {cat.name} {cat.department ? `(${cat.department})` : ''}
                                  </option>
                                ))
                              }
                            </select>
                            
                            <button
                              id={`transfer-btn-${desk.id}`}
                              onClick={() => {
                                const targetId = transferTargetId[desk.id];
                                if (targetId) {
                                  onTransferTicket(desk.id, targetId);
                                  setTransferTargetId(prev => ({...prev, [desk.id]: ''}));
                                }
                              }}
                              disabled={!transferTargetId[desk.id]}
                              className="px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition"
                              title="Desvia senha para outra especialidade com prioridade na recepção"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div id="desk-offline-notice" className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <span className="text-3xl text-slate-300 select-none">💤</span>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wide">Atendente Ausente</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed mx-auto">
                    {desk.attendantName ? (
                      <>Faça login como <strong>{desk.attendantName}</strong> ativando o guichê acima.</>
                    ) : (
                      <>Vincule ou faça login com seu operador e clique em Entrar para iniciar.</>
                    )}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
