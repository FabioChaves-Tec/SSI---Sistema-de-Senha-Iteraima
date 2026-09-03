/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, Guiche, Ticket, ServiceCategory } from '../types';
import AuthManager from './AuthManager';
import { 
  Play, 
  Power, 
  PhoneCall, 
  CheckSquare, 
  XSquare, 
  RefreshCw, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  ArrowRight,
  LogOut,
  HelpCircle,
  Activity,
  Layers,
  ChevronRight,
  User,
  CheckCircle2,
  Lock,
  Mail,
  UserPlus
} from 'lucide-react';

interface AtendimentoSoloProps {
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  users: UserAccount[];
  onRegisterUser: (newUser: UserAccount) => boolean;
  onRemoveUser?: (userId: string) => void;
  onApproveUser?: (userId: string) => void;
  guiches: Guiche[];
  onAssociateUserWithGuiche: (userId: string, guicheNumber: number | null) => void;
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

export default function AtendimentoSolo({
  currentUser,
  setCurrentUser,
  users,
  onRegisterUser,
  onRemoveUser,
  onApproveUser,
  guiches,
  onAssociateUserWithGuiche,
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
}: AtendimentoSoloProps) {
  const [typedGuiche, setTypedGuiche] = useState<string>('');
  const [guicheError, setGuicheError] = useState<string>('');
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [elapsedText, setElapsedText] = useState<string>('--:--');

  // Find the active guiche corresponding to the logged-in attendant
  const myGuiche = currentUser?.guicheNumber 
    ? guiches.find(g => g.number === currentUser.guicheNumber) 
    : null;

  // Track the duration timer of the active call or meeting
  useEffect(() => {
    if (!myGuiche) {
      setElapsedText('--:--');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      if (myGuiche.status === 'serving' && myGuiche.currentTicket?.servingStartedAt) {
        const secs = Math.floor((now - myGuiche.currentTicket.servingStartedAt) / 1000);
        const mins = Math.floor(secs / 60);
        const remainSecs = secs % 60;
        setElapsedText(`${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`);
      } else if (myGuiche.status === 'calling' && myGuiche.currentTicket?.calledAt) {
        const secs = Math.floor((now - myGuiche.currentTicket.calledAt) / 1000);
        setElapsedText(`Chamando (${secs}s)`);
      } else {
        setElapsedText('--:--');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [myGuiche]);

  const handleLinkGuicheSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuicheError('');

    if (!currentUser) return;
    if (typedGuiche.trim() === '') {
      setGuicheError('Informe o número do guichê.');
      return;
    }

    const num = parseInt(typedGuiche.trim());
    if (isNaN(num) || num <= 0 || num > 99) {
      setGuicheError('Por favor, digite um número inteiro entre 1 e 99.');
      return;
    }

    // Associate current logged in user to the specified desk
    onAssociateUserWithGuiche(currentUser.id, num);
  };

  const handleReleaseGuiche = () => {
    if (!currentUser) return;
    onAssociateUserWithGuiche(currentUser.id, null);
    setTypedGuiche('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // If the user is not authenticated, render the dedicated authentication block
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="mb-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black tracking-widest font-mono uppercase bg-white/20 px-2 py-0.5 rounded">MODO ATENDENTE</span>
            <h1 className="text-xl font-bold tracking-tight text-white mt-1.5">Portal de Atendimento SSI</h1>
            <p className="text-xs text-white/80 mt-1">Realize a autenticação funcional para iniciar as chamadas e regularizar a fila.</p>
          </div>
          <Lock className="w-10 h-10 stroke-[1.2] opacity-80" />
        </div>
        <AuthManager
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          users={users}
          onRegisterUser={onRegisterUser}
          onRemoveUser={onRemoveUser}
          onApproveUser={onApproveUser}
          guiches={guiches}
          onAssociateUserWithGuiche={onAssociateUserWithGuiche}
        />
      </div>
    );
  }

  // If logged in but hasn't designated their physical desk number
  if (!currentUser.guicheNumber) {
    return (
      <div className="max-w-md mx-auto py-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black mb-4">
            <Layers className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-800">Defina sua Estação Física</h2>
          <p className="text-xs text-slate-500 mt-2.5 max-w-sm leading-relaxed">
            Olá, <strong>{currentUser.name}</strong>! Para que o sistema vocalize seu guichê e exiba as senhas corretamente no saguão, informe em qual mesa você se encontra hoje:
          </p>

          <form onSubmit={handleLinkGuicheSubmit} className="w-full mt-6 space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold font-mono text-slate-400 block mb-1 text-left">Número do Guichê (Ex: 1, 2, 5...)</label>
              <input
                type="number"
                min="1"
                max="99"
                placeholder="Insira o número do guichê físico"
                value={typedGuiche}
                onChange={(e) => setTypedGuiche(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-center"
              />
            </div>

            {guicheError && (
              <p className="text-xs text-rose-600 font-semibold">{guicheError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Entrar no Guichê e Operar
            </button>
          </form>

          <div className="w-full border-t border-slate-150 pt-4 mt-6 flex justify-between items-center text-xs text-slate-500">
            <span>Operador: {currentUser.name}</span>
            <button 
              onClick={handleLogout}
              className="text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Desk Operator Controls Interface
  const isOnline = myGuiche && myGuiche.status !== 'offline';
  const currentTicket = myGuiche?.currentTicket;

  // Filter tickets that correspond to this operator's current specialty focus
  const myCategoryIds = myGuiche ? myGuiche.categoryFocus : [];
  const myQueueCount = waitingTickets.filter(t => t.status === 'waiting' && myCategoryIds.includes(t.category.id)).length;

  return (
    <div className="max-w-3xl mx-auto py-2">
      {/* Mini Profile / Header section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">{currentUser.name}</h2>
              <span className="text-[9px] font-black uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Atendente SSI
              </span>
            </div>
            <p className="text-[11px] text-slate-450 font-sans mt-0.5">
              Estação de trabalho: <strong>Guichê 0{currentUser.guicheNumber}</strong> • {currentUser.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleReleaseGuiche}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          >
            Mudar Guichê ({currentUser.guicheNumber})
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-transparent rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Main interactive call terminal console */}
      {myGuiche && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Main Workspace Column */}
          <div className="md:col-span-2 border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col">
            
            {/* Operator desk status indicator */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              !isOnline 
                ? 'bg-slate-50 text-slate-500 border-slate-200' 
                : myGuiche.status === 'calling'
                ? 'bg-blue-500/10 text-blue-700 border-blue-200'
                : myGuiche.status === 'serving'
                ? 'bg-emerald-500/10 text-emerald-800 border-emerald-200'
                : 'bg-white text-slate-800 border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  !isOnline 
                    ? 'bg-slate-455' 
                    : myGuiche.status === 'idle' 
                    ? 'bg-green-500' 
                    : myGuiche.status === 'calling' 
                    ? 'bg-blue-502 animate-ping' 
                    : 'bg-orange-500'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  {!isOnline 
                    ? 'Guichê Fechado / Pausado' 
                    : myGuiche.status === 'idle' 
                    ? 'Online • Disponível' 
                    : myGuiche.status === 'calling' 
                    ? 'Chamando Cliente...' 
                    : 'Em Atendimento Ativo'
                  }
                </span>
              </div>

              {/* Toggle offline button */}
              <button
                onClick={() => onToggleOnline(myGuiche.id)}
                className={`flex items-center gap-1.5 px-3 py-1 bg-white border rounded-lg text-xs font-semibold cursor-pointer transition ${
                  isOnline 
                    ? 'hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:border-blue-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {isOnline ? 'Fechar Guichê' : 'Abrir Guichê'}
              </button>
            </div>

            {/* Terminal Main workspace body */}
            <div className="p-6">
              
              {!isOnline ? (
                /* 1. Offline Mode screen */
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-3">💤</span>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Guichê Fechado</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                    Você está em pausa ou fora de serviço. Clique em <strong>&quot;Abrir Guichê&quot;</strong> acima para entrar na fila de chamadas e atender cidadãos!
                  </p>
                </div>
              ) : (
                /* 2. Active Terminal Panel */
                <div className="space-y-6">
                  
                  {/* Active caller station screen */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center min-h-[140px] relative text-center">
                    {myGuiche.status === 'idle' ? (
                      /* Idle mode view */
                      <div className="flex flex-col items-center justify-center">
                        <UserCheck className="w-10 h-10 text-slate-300 stroke-[1.2] mb-2" />
                        <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Livre / Aguardando</span>
                        
                        {/* Interactive Queue count indicator */}
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/50 text-slate-600 text-xs font-semibold">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          <span>Fila atual do setor: <strong>{myQueueCount}</strong> senhas</span>
                        </div>
                      </div>
                    ) : currentTicket ? (
                      /* Call or serving active ticket */
                      <div className="w-full flex flex-col items-center">
                        <span className="text-xs font-bold tracking-widest font-mono text-slate-400 block uppercase mb-1">
                          {myGuiche.status === 'calling' ? 'SENHA QUE ESTÁ CHAMANDO' : 'ESTAMOS ATENDENDO AGORA'}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-5xl font-black font-mono tracking-tight text-slate-900 leading-none py-1">
                            {currentTicket.code}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${currentTicket.category.bgLight}`}>
                            {currentTicket.category.name}
                          </span>
                        </div>

                        {/* Timing and details bar */}
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Espera na Recepção: <strong className="text-slate-700">{Math.round((Date.now() - currentTicket.createdAt) / 1000 / 60)} min</strong>
                          </span>
                          
                          <span className="h-3.5 w-px bg-slate-200 hidden xs:block" />

                          <span className="shrink-0 font-mono font-bold text-slate-800 bg-slate-250/60 px-2.5 py-0.5 rounded flex items-center gap-1">
                            ⏱️ {elapsedText}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-rose-500 text-xs font-mono">
                        Falha de consistência de estado. Recarregando.
                      </div>
                    )}
                  </div>

                  {/* Calling and Serving Controls section */}
                  <div className="pt-2">
                    {/* IDLE: call next operator actions */}
                    {myGuiche.status === 'idle' && (
                      <button
                        onClick={() => onCallNext(myGuiche.id)}
                        disabled={myQueueCount === 0}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-bold text-sm rounded-xl transition shadow-md shadow-blue-500/10 active:scale-98 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        {myQueueCount > 0 ? 'Chamar Próximo na Fila' : 'Sem Senhas na Triagem'}
                      </button>
                    )}

                    {/* CALLING: recall and start service operator actions */}
                    {myGuiche.status === 'calling' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => onRecall(myGuiche.id)}
                          className="flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition active:scale-97 cursor-pointer"
                        >
                          <PhoneCall className="w-4 h-4" />
                          Refazer Chamada No Painel
                        </button>
                        
                        <button
                          onClick={() => onStartService(myGuiche.id)}
                          className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm active:scale-97 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white text-emerald-600" />
                          Iniciar Atendimento
                        </button>
                      </div>
                    )}

                    {/* SERVING: finish, absent and transfer actions */}
                    {myGuiche.status === 'serving' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => onNoShow(myGuiche.id)}
                            className="flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-150 font-semibold text-xs rounded-xl transition cursor-pointer font-sans"
                          >
                            <XSquare className="w-4 h-4" />
                            Cliente Não Compareceu
                          </button>

                          <button
                            onClick={() => onCompleteService(myGuiche.id, 5)}
                            className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-97 cursor-pointer"
                          >
                            <CheckSquare className="w-4 h-4" />
                            Concluir Atendimento
                          </button>
                        </div>

                        {/* Transfer panel drawer inside solo atendente workspace */}
                        <div className="border-t border-slate-150 pt-4 mt-2">
                          <span className="text-[10px] uppercase font-bold font-mono text-slate-400 block mb-2">Desviar / Transferir Senha para Outro Setor</span>
                          
                          <div className="flex gap-2">
                            <select
                              value={transferTargetId}
                              onChange={(e) => setTransferTargetId(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Selecione setor de destino...</option>
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
                              onClick={() => {
                                if (transferTargetId) {
                                  onTransferTicket(myGuiche.id, transferTargetId);
                                  setTransferTargetId('');
                                }
                              }}
                              disabled={!transferTargetId}
                              className="px-4.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                            >
                              Transferir <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Specialties / Desk Specialties Sidebar Panel */}
          <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                <Layers className="w-4 h-4 text-slate-500" /> 
                Seus Setores
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-1">
                Selecione quais serviços você está habilitado a atender neste guichê:
              </p>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => {
                const isFocused = myGuiche ? myGuiche.categoryFocus.includes(cat.id) : false;
                const queueSizeForCat = waitingTickets.filter(t => t.status === 'waiting' && t.category.id === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    disabled={!isOnline}
                    onClick={() => myGuiche && onToggleCategoryFocus(myGuiche.id, cat.id)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      !isOnline
                        ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200/50'
                        : isFocused
                        ? 'bg-slate-50 text-slate-900 border-indigo-200 font-medium'
                        : 'bg-white hover:bg-slate-50 text-slate-450 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full ${cat.color} shrink-0`} />
                      <div>
                        <span className="text-[11px] font-bold block uppercase tracking-tight">{cat.name}</span>
                        {cat.department && (
                          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase tracking-tight text-left mt-0.5">
                            🏢 {cat.department}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 block font-mono">Prefixo: {cat.prefix}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                      queueSizeForCat > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-450'
                    }`}>
                      {queueSizeForCat}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-500 leading-normal">
              <strong>💡 Legenda e SLA:</strong> Geral (Atendimento comum), Rápido (Certidões e protocolos simples), Prioritário (Conforme legislação em vigor - idosos, PCD).
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
