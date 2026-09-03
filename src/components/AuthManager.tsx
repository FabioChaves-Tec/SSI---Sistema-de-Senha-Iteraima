/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserAccount, Guiche } from '../types';
import { 
  LogIn, 
  UserPlus, 
  LogOut, 
  ShieldCheck, 
  Users, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Hash,
  ChevronRight,
  Shield,
  Check,
  UserX,
  Trash2
} from 'lucide-react';

interface AuthManagerProps {
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  users: UserAccount[];
  onRegisterUser: (newUser: UserAccount) => boolean; // return boolean if success (like no email duplicates)
  onRemoveUser?: (userId: string) => void;
  onApproveUser?: (userId: string) => void;
  guiches: Guiche[];
  onAssociateUserWithGuiche: (userId: string, guicheNumber: number | null) => void;
}

export default function AuthManager({
  currentUser,
  setCurrentUser,
  users,
  onRegisterUser,
  onRemoveUser,
  onApproveUser,
  guiches,
  onAssociateUserWithGuiche,
}: AuthManagerProps) {
  // Tabs: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Login form status
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form status
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'attendant' | 'supervisor'>('attendant');
  const [regGuiche, setRegGuiche] = useState<string>(''); // empty means none/floating
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Active attendant typed guiche states
  const [typedGuiche, setTypedGuiche] = useState<string>('');
  const [typedGuicheError, setTypedGuicheError] = useState<string>('');
  const [typedGuicheSuccess, setTypedGuicheSuccess] = useState<string>('');

  // Update typed guiche value when active user or their profile updates
  React.useEffect(() => {
    if (currentUser) {
      setTypedGuiche(currentUser.guicheNumber ? currentUser.guicheNumber.toString() : '');
    } else {
      setTypedGuiche('');
    }
    setTypedGuicheError('');
    setTypedGuicheSuccess('');
  }, [currentUser]);

  const handleSaveTypedGuiche = (e: React.FormEvent) => {
    e.preventDefault();
    setTypedGuicheError('');
    setTypedGuicheSuccess('');

    if (!currentUser) return;

    if (typedGuiche.trim() === '') {
      onAssociateUserWithGuiche(currentUser.id, null);
      setTypedGuicheSuccess('Guichê desvinculado com sucesso!');
      return;
    }

    const num = parseInt(typedGuiche.trim());
    if (isNaN(num) || num <= 0) {
      setTypedGuicheError('Por favor, informe um número de guichê válido maior que 0.');
      return;
    }

    onAssociateUserWithGuiche(currentUser.id, num);
    setTypedGuicheSuccess(`Guichê 0${num} vinculado com sucesso!`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Preencha todos os campos obrigatórios.');
      return;
    }

    const cleanInput = loginEmail.trim().toLowerCase();
    const foundUser = users.find(
      (u) => 
        (u.email.toLowerCase() === cleanInput || 
         u.name.toLowerCase() === cleanInput || 
         u.id.toLowerCase() === cleanInput) && 
        u.password === loginPassword
    );

    if (foundUser) {
      if (foundUser.isApproved === false) {
        setLoginError('Sua conta está aguardando aprovação de um supervisor.');
        return;
      }
      setCurrentUser(foundUser);
      // Clean up fields
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setLoginError('E-mail ou usuário / senha incorretos.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName || !regEmail || !regPassword) {
      setRegError('Preencha os campos Nome, E-mail e Senha.');
      return;
    }

    if (regPassword.length < 3) {
      setRegError('A senha precisa ter no mínimo 3 caracteres.');
      return;
    }

    const targetGuicheNum = regGuiche && regGuiche.trim() !== '' ? parseInt(regGuiche.trim()) : undefined;
    
    const newUser: UserAccount = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: regName,
      email: regEmail,
      role: regRole,
      password: regPassword,
      guicheNumber: targetGuicheNum,
      isApproved: false, // Newly registered users are pending approval
    };

    const isSuccess = onRegisterUser(newUser);

    if (isSuccess) {
      setRegSuccess('Cadastro realizado! Aguarde a aprovação de um supervisor.');
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegRole('attendant');
      setRegGuiche('');
      
      // Auto switch back to login after showing success for a brief moment
      setTimeout(() => {
        setAuthMode('login');
        setRegSuccess('');
      }, 3500);
    } else {
      setRegError('Este e-mail já está sendo utilizado.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleDeskAssociationChange = (guicheNumStr: string) => {
    if (!currentUser) return;
    const num = guicheNumStr === 'none' ? null : parseInt(guicheNumStr);
    onAssociateUserWithGuiche(currentUser.id, num);
  };

  return (
    <div id="auth-manager-root" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col h-full">
      
      {/* Header section */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
            {currentUser ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Portal Operador SSI</h2>
            <p className="text-[10px] text-slate-500 font-mono">AUTENTICAÇÃO E CADASTROS</p>
          </div>
        </div>

        {currentUser && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-blue-100 text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Online
          </span>
        )}
      </div>

      {/* Main interactive area */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        
        {!currentUser ? (
          /* ========================================== */
          /* ANONYMOUS MODE: LOGIN or REGISTER forms   */
          /* ========================================== */
          <div>
            {/* Form category options */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold mb-6 border border-slate-200/40">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setRegError('');
                  setLoginError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  authMode === 'login' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Acessar Portal
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegError('');
                  setLoginError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  authMode === 'register' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Cadastrar Operador
              </button>
            </div>

            {/* Error & Success announcements */}
            {loginError && (
              <div className="mb-4 bg-rose-50 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 border border-rose-100 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {regError && (
              <div className="mb-4 bg-rose-50 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 border border-rose-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="mb-4 bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            {/* 1. Login form */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">E-mail ou Usuário</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ssi_user ou clarice@iteraima.rr.gov.br"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">Senha SSI</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Insira sua senha de acesso"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Entrar no Sistema
                </button>


              </form>
            ) : (
              /* 2. Registration form */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">Nome Completo</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Jorge Amado"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">E-mail para Acesso</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jorge@sganeo.com.br"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">Função / Cargo</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'attendant' | 'supervisor')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    >
                      <option value="attendant">Atendente</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">Nº do Guichê (Opcional)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 5"
                      value={regGuiche}
                      disabled={regRole === 'supervisor'}
                      onChange={(e) => setRegGuiche(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-850 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold font-mono text-slate-400 block mb-1">Senha da Conta</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Crie uma senha segura"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Concluir Cadastro
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ========================================== */
          /* LOGGED IN ACTIVE PROFILE & ADMIN CONSOLE   */
          /* ========================================== */
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Profile card block */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg bg-gradient-to-tr ${
                    currentUser.role === 'supervisor' ? 'from-amber-500 to-orange-650' : 'from-blue-600 to-indigo-600'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {currentUser.name}
                    </h3>
                    <p className="text-slate-450 text-[10px] font-mono leading-none mt-1">
                      {currentUser.email}
                    </p>
                    <span className={`inline-block mt-1.5 text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                      currentUser.role === 'supervisor' 
                        ? 'bg-amber-150 text-amber-900' 
                        : 'bg-blue-150 text-blue-900'
                    }`}>
                      {currentUser.role === 'supervisor' ? 'Supervisor SSI' : 'Atendente'}
                    </span>
                  </div>
                </div>

                {/* Logout Trigger button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-slate-250 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  title="Sair do perfil"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Attendant workspace controls (If simple attendant logged in) */}
              {currentUser.role === 'attendant' && (
                <div className="space-y-4">
                  <form onSubmit={handleSaveTypedGuiche} className="border border-slate-200/65 rounded-xl p-3.5 bg-slate-50/20 space-y-3">
                    <label className="text-[10px] uppercase font-bold font-mono text-slate-400 block mb-1">Preencher Número do seu Guichê</label>
                    
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        placeholder="Ex: 5"
                        value={typedGuiche}
                        onChange={(e) => setTypedGuiche(e.target.value)}
                        className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-850 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-98 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Vincular Guichê
                      </button>
                    </div>

                    {typedGuicheError && (
                      <p className="text-[10px] text-rose-600 font-semibold">{typedGuicheError}</p>
                    )}
                    {typedGuicheSuccess && (
                      <p className="text-[10px] text-emerald-650 font-semibold">{typedGuicheSuccess}</p>
                    )}

                    <p className="text-[10px] text-slate-450 italic leading-normal">
                      * Digite o número do guichê em que você se encontra hoje (ex: 1, 2, 5). O painel vinculará seu nome a essa estação de atendimento de forma imediata!
                    </p>
                  </form>
                </div>
              )}

              {/* Supervisor Administrative Panel Controls (If Admin/Supervisor logged in) */}
              {currentUser.role === 'supervisor' && (() => {
                const pendingUsers = users.filter(u => u.isApproved === false);
                const approvedUsers = users.filter(u => u.isApproved !== false);

                return (
                  <div className="space-y-4">
                    {/* 1. Pending approval requests list */}
                    <div className="border border-amber-250/80 rounded-2xl p-4 bg-amber-500/5 space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-200/40 pb-2">
                        <span className="text-xs uppercase font-extrabold font-mono text-amber-800 flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" />
                          Aprovações Pendentes ({pendingUsers.length})
                        </span>
                      </div>
                      
                      {pendingUsers.length === 0 ? (
                        <p className="text-slate-400 text-xs italic py-1">Nenhum operador aguardando aprovação no momento.</p>
                      ) : (
                        <div className="max-h-[200px] overflow-y-auto space-y-2.5 divide-y divide-amber-100/40">
                          {pendingUsers.map((u, idx) => (
                            <div key={u.id} className={`pt-2 flex justify-between items-start text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 block leading-tight">{u.name}</span>
                                <span className="text-[10px] text-slate-500 block leading-none">{u.email}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">Cargo: {u.role === 'supervisor' ? 'Supervisor' : 'Atendente'}</span>
                              </div>

                              <div className="flex gap-1.5 items-center">
                                <button
                                  type="button"
                                  onClick={() => onApproveUser && onApproveUser(u.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Aprovar Usuário"
                                >
                                  <Check className="w-3 h-3" />
                                  Aceitar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveUser && onRemoveUser(u.id)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Recusar Registro"
                                >
                                  <UserX className="w-3 h-3" />
                                  Recusar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Active approved operators list */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs uppercase font-extrabold font-mono text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Operadores Ativos ({approvedUsers.length})
                        </span>
                      </div>
                      
                      <div className="max-h-[220px] overflow-y-auto space-y-2 divide-y divide-slate-100">
                        {approvedUsers.map((u, idx) => {
                          const isSelf = currentUser?.id === u.id;
                          return (
                            <div key={u.id} className={`pt-2 flex justify-between items-center text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                              <div className="space-y-0.5 max-w-[60%]">
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  {u.name}
                                  {isSelf && (
                                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold uppercase">(Você)</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500 block font-mono truncate">{u.email}</span>
                                <span className="text-[9px] text-slate-400 block">Senha: {u.password}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`inline-block text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                                  u.role === 'supervisor' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {u.role === 'supervisor' ? 'Supervisor' : u.guicheNumber ? `G0${u.guicheNumber}` : 'Flutuante'}
                                </span>
                                
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Deseja realmente remover o operador e revogar seus acessos: ${u.name}?`)) {
                                        onRemoveUser && onRemoveUser(u.id);
                                      }
                                    }}
                                    className="p-1 px-1.5 hover:bg-rose-105 text-slate-400 hover:text-rose-600 rounded-lg transition border border-transparent hover:border-rose-250 cursor-pointer"
                                    title="Remover Operador"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        Status de auditor: <strong>Acesso Total</strong>
                      </span>
                      <span>Modo Fiscalizador</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Auditoria SSI (Iteraima)</span>
              <span>v2.1</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
