/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ServiceCategory, Ticket } from '../types';
import { 
  User, 
  Award, 
  Briefcase, 
  Zap, 
  Printer, 
  Clock, 
  Users, 
  ArrowRight, 
  X, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Building,
  AlertCircle
} from 'lucide-react';

interface TicketDispenserProps {
  categories: ServiceCategory[];
  waitingTickets: Ticket[];
  onEmitTicket: (categoryId: string) => Ticket;
  onUpdateCategories?: (cats: ServiceCategory[]) => void;
}

export default function TicketDispenser({
  categories,
  waitingTickets,
  onEmitTicket,
  onUpdateCategories,
}: TicketDispenserProps) {
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Managing Active Editing Item
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Form states
  const [catName, setCatName] = useState('');
  const [catPrefix, setCatPrefix] = useState('');
  const [catDepartment, setCatDepartment] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catAvgDuration, setCatAvgDuration] = useState(15);
  const [catColor, setCatColor] = useState('emerald');
  const [catIcon, setCatIcon] = useState('User');

  const handleEmit = (categoryId: string) => {
    setIsPrinting(true);
    
    // Simulate printing sound & physical delay for top tier UX
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) {}

    setTimeout(() => {
      const newTicket = onEmitTicket(categoryId);
      setIssuedTicket(newTicket);
      setIsPrinting(false);
    }, 750);
  };

  // Helper count of waiting tickets per category
  const getQueueSize = (catId: string) => {
    return waitingTickets.filter(t => t.category.id === catId && t.status === 'waiting').length;
  };

  // Clean icon mapping helper
  const renderCategoryIcon = (iconName: string, color: string) => {
    const classStr = `w-6 h-6 shrink-0 text-${color}-600`;
    switch (iconName) {
      case 'Award': return <Award className={classStr} />;
      case 'Briefcase': return <Briefcase className={classStr} />;
      case 'Zap': return <Zap className={classStr} />;
      default: return <User className={classStr} />;
    }
  };

  // Open Form for Editing Category
  const startEdit = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setIsAddingNew(false);
    setCatName(cat.name);
    setCatPrefix(cat.prefix);
    setCatDepartment(cat.department || '');
    setCatDescription(cat.description);
    setCatAvgDuration(cat.avgDurationMin);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
  };

  // Open Form for Adding New Category
  const startCreate = () => {
    setIsAddingNew(true);
    setEditingCategory(null);
    setCatName('');
    setCatPrefix('');
    setCatDepartment('');
    setCatDescription('');
    setCatAvgDuration(15);
    setCatColor('emerald');
    setCatIcon('User');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCategories) return;

    if (!catName.trim() || !catPrefix.trim() || !catDepartment.trim()) {
      return;
    }

    const bgLight = `bg-${catColor}-50 text-${catColor}-800 border-${catColor}-200`;
    const borderCol = `border-${catColor}-500`;
    const textColor = `text-${catColor}-600`;

    if (isAddingNew) {
      const newCat: ServiceCategory = {
        id: `cat_${Date.now()}`,
        name: catName.trim(),
        prefix: catPrefix.trim().toUpperCase().substring(0, 2),
        description: catDescription.trim() || 'Sem descrição.',
        icon: catIcon,
        color: catColor,
        bgLight,
        borderCol,
        textColor,
        avgDurationMin: Number(catAvgDuration) || 15,
        department: catDepartment.trim(),
      };

      onUpdateCategories([...categories, newCat]);
    } else if (editingCategory) {
      const updated = categories.map(c => {
        if (c.id === editingCategory.id) {
          return {
            ...c,
            name: catName.trim(),
            prefix: catPrefix.trim().toUpperCase().substring(0, 2),
            description: catDescription.trim() || c.description,
            icon: catIcon,
            color: catColor,
            bgLight,
            borderCol,
            textColor,
            avgDurationMin: Number(catAvgDuration) || 15,
            department: catDepartment.trim(),
          };
        }
        return c;
      });

      onUpdateCategories(updated);
    }

    // Reset editing active state
    setEditingCategory(null);
    setIsAddingNew(false);
  };

  const handleDeleteCategory = (catId: string) => {
    if (!onUpdateCategories) return;
    if (categories.length <= 1) {
      return;
    }
    
    // Safety check for active queues
    const activelyWaiting = waitingTickets.filter(t => t.category.id === catId && t.status === 'waiting').length;
    let warningMsg = 'Deseja realmente remover este serviço da triagem?';
    if (activelyWaiting > 0) {
      warningMsg = `Atenção: Existem ${activelyWaiting} senhas aguardando atendimento nesta categoria. Removê-la excluirá o serviço e as chamadas podem ficar inacessíveis. Confirmar?`;
    }

    if (window.confirm(warningMsg)) {
      onUpdateCategories(categories.filter(c => c.id !== catId));
      if (editingCategory?.id === catId) {
        setEditingCategory(null);
      }
    }
  };

  return (
    <div id="dispenser-root" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans tracking-tight text-slate-800">Totem de Triagem</h2>
              <p className="text-xs text-slate-500">SELECIONE O TIPO DE SERVIÇO DESEJADO</p>
            </div>
          </div>

          {/* Config Key Action */}
          {onUpdateCategories && (
            <button
              onClick={() => {
                setIsConfigModalOpen(true);
                startCreate(); // Default focus
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition flex items-center gap-1.5 text-xs font-semibold border border-slate-200/60 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>Alterar Serviços</span>
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-5">
          Retire sua senha para atendimento presencial. Cada serviço está diretamente vinculado ao departamento responsável dentro da estrutura do Iteraima.
        </p>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => {
            const queueCount = getQueueSize(category.id);
            const cardBg = `hover:bg-slate-50/80 hover:border-slate-350 cursor-pointer border border-slate-200/60 rounded-xl p-4 transition-all hover:shadow-md flex flex-col justify-between group active:scale-[0.98] relative overflow-hidden bg-white`;
            
            return (
              <div
                id={`emit-card-${category.id}`}
                key={category.id}
                onClick={() => !isPrinting && handleEmit(category.id)}
                className={cardBg}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg bg-slate-50 border border-slate-100`}>
                    {renderCategoryIcon(category.icon, category.color)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition truncate">
                        {category.name}
                      </h3>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${category.bgLight}`}>
                        {category.prefix}
                      </span>
                    </div>

                    {category.department ? (
                      <div className="inline-flex items-center gap-1 mt-1 bg-slate-100/80 px-2 py-0.5 rounded text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                        <Building className="w-2.5 h-2.5 text-slate-400" />
                        <span className="truncate max-w-[150px]">{category.department}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 mt-1 bg-slate-100/80 px-2 py-0.5 rounded text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        <Building className="w-2.5 h-2.5" />
                        <span>Sem Depto</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{category.avgDurationMin} min</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-slate-505">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fila: <strong className="text-slate-700">{queueCount}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>SSI (Iteraima) • Cadastro de Cidadãos</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Totem Online
        </span>
      </div>

      {/* Printing Interactive Overlay */}
      {isPrinting && (
        <div id="printing-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center max-w-xs w-full border border-slate-100 animate-pulse">
            <Printer className="w-12 h-12 text-blue-600 animate-bounce mb-3" />
            <h3 className="font-bold text-slate-800">Imprimindo Senha...</h3>
            <p className="text-xs text-slate-400 text-center mt-1">Por favor, retire seu ticket impresso a seguir no balcão.</p>
          </div>
        </div>
      )}

      {/* Interactive Rendered Physical Ticket (Modal dialog) */}
      {issuedTicket && (
        <div id="issued-ticket-modal" className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-250 flex flex-col">
            <div className="p-1 bg-blue-600"></div>
            
            <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">TICKET EMITIDO</span>
              <button 
                id="close-ticket-modal"
                onClick={() => setIssuedTicket(null)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 relative flex flex-col items-center">
              <div className="text-center">
                <span className="text-[10px] tracking-widest font-bold uppercase font-mono text-slate-400 block mb-1">SSI - Totem de Autoatendimento</span>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 tracking-wide font-semibold block mt-1.5">
                  {issuedTicket.category.name}
                </span>
                {issuedTicket.category.department && (
                  <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase">
                    Destino: {issuedTicket.category.department}
                  </span>
                )}
              </div>

              {/* Ticket Code Box */}
              <div id="printed-ticket-code" className="text-5xl font-black font-mono tracking-tighter text-slate-800 my-6 bg-slate-50 border border-slate-100 px-6 py-4 rounded-xl shadow-inner text-center">
                {issuedTicket.code}
              </div>

              {/* Barcode vector mockup */}
              <div id="ticket-barcode" className="w-4/5 h-8 flex flex-row gap-0.5 mb-6 justify-center" aria-hidden="true">
                {[2,4,1,3,2,1,4,2,3,1,2,4,1,2,3,4,1,3,2,1].map((w, i) => (
                  <div key={i} className={`bg-slate-800 ${w === 4 ? 'w-[4px]' : w === 3 ? 'w-[3px]' : w === 2 ? 'w-[2px]' : 'w-[1px]'}`}></div>
                ))}
              </div>

              <div className="w-full border-t border-dashed border-slate-200 my-2 pt-4 flex flex-col gap-2 font-mono text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Data/Hora:</span>
                  <span className="text-slate-800 font-semibold text-right">
                    {new Date(issuedTicket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Sua frente:</span>
                  <span className="text-slate-800 font-bold">
                    {getQueueSize(issuedTicket.category.id) - 1} pessoa(s)
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Estimativa de espera:</span>
                  <span className="text-blue-600 font-bold">
                    ~{Math.max(1, (getQueueSize(issuedTicket.category.id) - 1)) * issuedTicket.category.avgDurationMin} min
                  </span>
                </div>
              </div>

              {/* Jagged teeth paper cutout effect */}
              <div className="absolute bottom-0 left-0 right-0 h-2 flex overflow-hidden translate-y-3/4 opacity-15">
                {Array.from({ length: 40 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45 shrink-0"
                    style={{ transform: 'rotate(45deg) translateY(-2px)' }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                id="confirm-ticket-printed"
                onClick={() => setIssuedTicket(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
              >
                Retirar Impresso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN LEVEL: EDITING SERVICES & DEPARTMENTS SYSTEM MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-850 flex items-center gap-1.5 text-base">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span>Configurador de Serviços e Departamentos</span>
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Customize a triagem inserindo novos órgãos roraimenses ou ajustando os existentes.
                </p>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Panel: Available Category list (Col: 5) */}
              <div className="md:col-span-5 border-r border-slate-150 pr-0 md:pr-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Serviços Habilitados</span>
                  <button
                    onClick={startCreate}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition border border-blue-200/50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Novo Serviço
                  </button>
                </div>

                <div className="space-y-2">
                  {categories.map((cat) => {
                    const isSelected = editingCategory?.id === cat.id;
                    const activeFormFocus = !isAddingNew && isSelected;
                    
                    return (
                      <div
                        key={cat.id}
                        className={`p-3 rounded-xl border transition-all ${
                          activeFormFocus 
                            ? 'bg-blue-50/50 border-indigo-400 shadow-xs' 
                            : 'bg-white hover:bg-slate-50/50 border-slate-150'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`block w-2.5 h-2.5 rounded-full ${cat.color === 'emerald' ? 'bg-emerald-500' : cat.color === 'amber' ? 'bg-amber-500' : cat.color === 'indigo' ? 'bg-indigo-500' : 'bg-sky-500'}`} />
                            <strong className="text-xs text-slate-800 font-bold block">{cat.name}</strong>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {cat.prefix}
                          </span>
                        </div>

                        {cat.department ? (
                          <div className="text-[10px] font-semibold text-slate-500 mt-1 uppercase flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{cat.department}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">
                            Sem Depto Vinculado
                          </div>
                        )}

                        <div className="mt-3.5 flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                          {deletingCatId === cat.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                              <span className="text-[10px] font-bold text-rose-700">Confirma?</span>
                              <button
                                onClick={() => {
                                  onUpdateCategories?.(categories.filter(c => c.id !== cat.id));
                                  if (editingCategory?.id === cat.id) {
                                    setEditingCategory(null);
                                  }
                                  setDeletingCatId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[9px] cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setDeletingCatId(null)}
                                className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-200 rounded font-semibold text-[9px] cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(cat)}
                                className="p-1 text-slate-550 hover:text-blue-600 hover:bg-blue-50/50 rounded transition text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" /> Editar
                              </button>
                              
                              <button
                                onClick={() => setDeletingCatId(cat.id)}
                                disabled={categories.length <= 1}
                                className={`p-1 rounded transition text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer ${
                                  categories.length <= 1 
                                    ? 'text-slate-300 cursor-not-allowed' 
                                    : 'text-slate-450 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" /> Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Add or Edit Form (Col: 7) */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-4">
                    {isAddingNew ? 'Cadastrar Novo Tipo de Serviço' : 'Editar Propriedades do Serviço'}
                  </h4>

                  <form onSubmit={handleSaveCategory} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Name */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Nome do Serviço</label>
                        <input
                          type="text"
                          required
                          value={catName}
                          onChange={(e) => setCatName(e.target.value)}
                          placeholder="Ex: Título Definitivo de Terra"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      {/* Prefix */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Prefixo (Letra)</label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={catPrefix}
                          onChange={(e) => setCatPrefix(e.target.value.toUpperCase())}
                          placeholder="Ex: T"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-center"
                        />
                      </div>
                    </div>

                    {/* Department name of service */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Departamento Responsável</label>
                      <input
                        type="text"
                        required
                        value={catDepartment}
                        onChange={(e) => setCatDepartment(e.target.value)}
                        placeholder="Ex: Divisão de Cadastro e Regularização"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1">Este departamento determinará o direcionamento físico das senhas emitidas.</span>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Descrição Detalhada do Serviço</label>
                      <textarea
                        value={catDescription}
                        onChange={(e) => setCatDescription(e.target.value)}
                        placeholder="Quais são as regras, documentos exigidos ou escopo deste atendimento?"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* SLA average duration */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Tempo Médio (Minutos)</label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={catAvgDuration}
                          onChange={(e) => setCatAvgDuration(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      {/* Accent Color selection */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Cor Temática</label>
                        <select
                          value={catColor}
                          onChange={(e) => setCatColor(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                        >
                          <option value="emerald">Verde (Emerald)</option>
                          <option value="amber">Laranja (Amber)</option>
                          <option value="indigo">Lilás (Indigo)</option>
                          <option value="sky">Azul (Sky)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">Ícone Visual</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { name: 'User', desc: 'Atendente' },
                          { name: 'Award', desc: 'Prioridade' },
                          { name: 'Briefcase', desc: 'Negócios' },
                          { name: 'Zap', desc: 'Rápido' }
                        ].map((ic) => (
                          <button
                            key={ic.name}
                            type="button"
                            onClick={() => setCatIcon(ic.name)}
                            className={`p-2 border rounded-xl flex items-center justify-center flex-col gap-1 text-[10px] cursor-pointer font-bold ${
                              catIcon === ic.name 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                            }`}
                          >
                            {renderCategoryIcon(ic.name, catIcon === ic.name ? 'white' : catColor)}
                            <span>{ic.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Box */}
                    <div className="pt-4 border-t border-slate-150 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 max-w-[50%]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        Aperte salvar para enviar os dados para os guichês de atendimento.
                      </span>

                      <button
                        type="submit"
                        disabled={!catName.trim() || !catPrefix.trim() || !catDepartment.trim()}
                        className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 fill-white" />
                        {isAddingNew ? 'Inserir na Grade' : 'Atualizar Serviço'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>

            {/* Bottom Actions of main modal */}
            <div className="px-6 py-3 border-t border-slate-150 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 bg-white text-slate-600 border border-slate-200 font-bold rounded-xl transition hover:bg-slate-100 cursor-pointer"
              >
                Retornar ao Totem
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
