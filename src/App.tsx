/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Guiche, ServiceCategory, HistoricalRecord, TicketStatus, UserAccount, MonthlyReportLog } from './types';
import { 
  DEFAULT_CATEGORIES, 
  INITIAL_GUICHES, 
  generateInitialTickets, 
  generateInitialHistory,
  INITIAL_USERS
} from './data';
import { playChime, speakTicket } from './utils/audio';

import PanelMonitor from './components/PanelMonitor';
import TicketDispenser from './components/TicketDispenser';
import DeskOperator from './components/DeskOperator';
import DashboardStats from './components/DashboardStats';
import AuthManager from './components/AuthManager';
import AtendimentoSolo from './components/AtendimentoSolo';

import { 
  Tv, 
  Users, 
  LayoutGrid, 
  Printer, 
  Settings, 
  TrendingUp, 
  RotateCcw,
  BookOpen,
  Volume2,
  Moon,
  Sun,
  Bot,
  Lock,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // ----------------------------------------------------
  // Persistent State Loaders
  // ----------------------------------------------------
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('sga_neo_tickets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to restore tickets', e);
      }
    }
    return generateInitialTickets();
  });

  const [guiches, setGuiches] = useState<Guiche[]>(() => {
    const saved = localStorage.getItem('sga_neo_guiches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: If we have old fictional names in guiches
        const hasFictional = parsed.some((g: any) => g.attendantName === 'Clarice Lispector' || (g.number === 1 && g.status === 'idle'));
        if (hasFictional) {
          localStorage.setItem('sga_neo_guiches', JSON.stringify(INITIAL_GUICHES));
          return INITIAL_GUICHES;
        }
        return parsed.map((g: Guiche) => ({ ...g, isCallingAnimation: false }));
      } catch (e) {
        console.error('Failed to restore guiches', e);
      }
    }
    return INITIAL_GUICHES;
  });

  const [history, setHistory] = useState<HistoricalRecord[]>(() => {
    const saved = localStorage.getItem('sga_neo_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasFictional = parsed.some((h: any) => h.attendantName === 'Clarice Lispector');
        if (hasFictional) {
          const freshHistory = generateInitialHistory();
          localStorage.setItem('sga_neo_history', JSON.stringify(freshHistory));
          return freshHistory;
        }
        // Ensure all loaded records have unique IDs to eliminate any duplicate key errors from existing storage
        const seenIds = new Set<string>();
        const updatedParsed = parsed.map((h: any, idx: number) => {
          if (!h.id || seenIds.has(h.id)) {
            const uniqueId = `h_mig_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
            seenIds.add(uniqueId);
            return { ...h, id: uniqueId };
          }
          seenIds.add(h.id);
          return h;
        });
        return updatedParsed;
      } catch (e) {
        console.error('Failed to restore history', e);
      }
    }
    return generateInitialHistory();
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('sga_neo_muted') === 'true';
  });

  const [vocalizeAllLetters, setVocalizeAllLetters] = useState<boolean>(() => {
    return localStorage.getItem('sga_neo_vocalize') !== 'false';
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('sga_neo_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Check for fictional user names
        const hasFictional = parsed.some((u: any) => u.name === 'Clarice Lispector' || u.id === 'user_clarice');
        if (hasFictional) {
          localStorage.setItem('sga_neo_users', JSON.stringify(INITIAL_USERS));
          localStorage.setItem('sga_neo_guiches', JSON.stringify(INITIAL_GUICHES));
          localStorage.setItem('sga_neo_current_user', '');
          localStorage.setItem('sga_neo_history', JSON.stringify(generateInitialHistory()));
          return INITIAL_USERS;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to restore users', e);
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('sga_neo_current_user');
    if (saved && saved !== 'undefined') {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name === 'Clarice Lispector' || parsed.id === 'user_clarice')) {
          return null;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to restore current_user', e);
      }
    }
    return null;
  });

  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    const saved = localStorage.getItem('sga_neo_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to restore categories', e);
      }
    }
    return DEFAULT_CATEGORIES;
  });

  const [activeTab, setActiveTab] = useState<'integrated' | 'panel' | 'totem' | 'stats' | 'auth' | 'atendimento'>('atendimento');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showDemoBanner, setShowDemoBanner] = useState<boolean>(true);
  const [hasFetchedInitial, setHasFetchedInitial] = useState<boolean>(false);
  const [statsLockEmail, setStatsLockEmail] = useState('');
  const [statsLockPassword, setStatsLockPassword] = useState('');
  const [statsLockError, setStatsLockError] = useState('');
  const [reports, setReports] = useState<MonthlyReportLog[]>([]);

  // ----------------------------------------------------
  // Sync State with Integrated SQLite Database (via Express fullstack backend)
  // ----------------------------------------------------
  const lastFetchedRef = useRef<{
    tickets: string;
    guiches: string;
    history: string;
    categories: string;
    users: string;
    isMuted: boolean;
    vocalizeAllLetters: boolean;
    currentUser: string;
  }>({
    tickets: '',
    guiches: '',
    history: '',
    categories: '',
    users: '',
    isMuted: false,
    vocalizeAllLetters: true,
    currentUser: ''
  });

  // Track timestamps of when standard updates are being uploaded by the client
  // so the polling system does not overwrite mid-flight modifications (eliminates race conditions)
  const lastPostedRef = useRef<{
    users: number;
    tickets: number;
    guiches: number;
    history: number;
    categories: number;
    currentUser: number;
  }>({
    users: 0,
    tickets: 0,
    guiches: 0,
    history: 0,
    categories: 0,
    currentUser: 0
  });

  // Pull active state from SQLite on load & periodically
  useEffect(() => {
    let active = true;
    const loadState = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error(`HTTP status: ${res.status}`);
        const data = await res.json();
        if (!active) return;
        if (data && !data.error) {
          if (data.categories) {
            const catStr = JSON.stringify(data.categories);
            const isJustPosted = lastPostedRef.current.categories > 0 && (Date.now() - lastPostedRef.current.categories < 3500);
            if (!isJustPosted && catStr !== lastFetchedRef.current.categories) {
              lastFetchedRef.current.categories = catStr;
              setCategories(data.categories);
              localStorage.setItem('sga_neo_categories', catStr);
            }
          }
          if (data.users) {
            const usersStr = JSON.stringify(data.users);
            const isJustPosted = lastPostedRef.current.users > 0 && (Date.now() - lastPostedRef.current.users < 3500);
            if (!isJustPosted && usersStr !== lastFetchedRef.current.users) {
              lastFetchedRef.current.users = usersStr;
              setUsers(data.users);
              localStorage.setItem('sga_neo_users', usersStr);

              // Local session synchronization: Update matching properties in local currentUser state
              setCurrentUser((prev) => {
                if (!prev) return null;
                const match = data.users.find((u: any) => u.id === prev.id);
                if (match) {
                  const updated = { ...prev, ...match };
                  // Stay synchronized locally in localStorage
                  localStorage.setItem('sga_neo_current_user', JSON.stringify(updated));
                  return updated;
                }
                return prev;
              });
            }
          }
          if (data.history) {
            const historyStr = JSON.stringify(data.history);
            const isJustPosted = lastPostedRef.current.history > 0 && (Date.now() - lastPostedRef.current.history < 3500);
            if (!isJustPosted && historyStr !== lastFetchedRef.current.history) {
              lastFetchedRef.current.history = historyStr;
              setHistory(data.history);
              localStorage.setItem('sga_neo_history', historyStr);
            }
          }
          if (data.tickets) {
            const ticketsStr = JSON.stringify(data.tickets);
            const isJustPosted = lastPostedRef.current.tickets > 0 && (Date.now() - lastPostedRef.current.tickets < 3500);
            if (!isJustPosted && ticketsStr !== lastFetchedRef.current.tickets) {
              lastFetchedRef.current.tickets = ticketsStr;
              setTickets(data.tickets);
              localStorage.setItem('sga_neo_tickets', ticketsStr);
            }
          }
          if (data.guiches) {
            const guichesStr = JSON.stringify(data.guiches);
            const isJustPosted = lastPostedRef.current.guiches > 0 && (Date.now() - lastPostedRef.current.guiches < 3500);
            if (!isJustPosted && guichesStr !== lastFetchedRef.current.guiches) {
              lastFetchedRef.current.guiches = guichesStr;
              
              // Smart voice trigger for multi-window desk notifications:
              // Play sound only if another computer changes status to 'calling'
              setGuiches((prev) => {
                return data.guiches.map((newG: any) => {
                  const existingG = prev.find(p => p.id === newG.id);
                  if (newG.status === 'calling' && existingG?.status !== 'calling' && newG.currentTicket) {
                    if (!isMuted) {
                      playChime();
                      setTimeout(() => {
                        const ticketCode = typeof newG.currentTicket === 'string' ? newG.currentTicket : (newG.currentTicket.code || '');
                        if (ticketCode) {
                          speakTicket(ticketCode, newG.number, vocalizeAllLetters);
                        }
                      }, 1200);
                    }
                  }
                  return newG;
                });
              });
              localStorage.setItem('sga_neo_guiches', guichesStr);
            }
          }
          if (data.prefs) {
            if (data.prefs.sga_neo_muted !== undefined) {
              const mutedVal = data.prefs.sga_neo_muted === 'true';
              if (mutedVal !== lastFetchedRef.current.isMuted) {
                lastFetchedRef.current.isMuted = mutedVal;
                setIsMuted(mutedVal);
                localStorage.setItem('sga_neo_muted', data.prefs.sga_neo_muted);
              }
            }
            if (data.prefs.sga_neo_vocalize !== undefined) {
              const vocVal = data.prefs.sga_neo_vocalize === 'true';
              if (vocVal !== lastFetchedRef.current.vocalizeAllLetters) {
                lastFetchedRef.current.vocalizeAllLetters = vocVal;
                setVocalizeAllLetters(vocVal);
                localStorage.setItem('sga_neo_vocalize', data.prefs.sga_neo_vocalize);
              }
            }
          }
          if (data.reports && Array.isArray(data.reports)) {
            setReports(data.reports);
          }
          // Mark that initial state from server has successfully loaded 
          setHasFetchedInitial(true);
        }
      } catch (err) {
        console.error('Failed to poll states from embedded DB', err);
      }
    };

    loadState();
    const timer = setInterval(loadState, 2000); // Polling interval
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isMuted, vocalizeAllLetters, currentUser]);

  const handleSaveReport = async (newReport: MonthlyReportLog) => {
    setReports(prev => [newReport, ...prev.filter(r => r.id !== newReport.id)]);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: newReport })
      });
    } catch (err) {
      console.error('Error saving report to DB', err);
    }
  };

  const handleDeleteReport = async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting report from DB', err);
    }
  };

  // Push local modifications to backend database
  useEffect(() => {
    if (!hasFetchedInitial) return;
    const json = JSON.stringify(users);
    if (json === lastFetchedRef.current.users) return;
    lastFetchedRef.current.users = json;
    localStorage.setItem('sga_neo_users', json);
    
    lastPostedRef.current.users = Date.now();
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    })
    .catch(e => console.error('Error syncing users to SQLite', e));
  }, [users, hasFetchedInitial]);

  useEffect(() => {
    const json = currentUser ? JSON.stringify(currentUser) : '';
    localStorage.setItem('sga_neo_current_user', json);
  }, [currentUser]);

  useEffect(() => {
    if (!hasFetchedInitial) return;
    const json = JSON.stringify(tickets);
    if (json === lastFetchedRef.current.tickets) return;
    lastFetchedRef.current.tickets = json;
    localStorage.setItem('sga_neo_tickets', json);
    
    lastPostedRef.current.tickets = Date.now();
    fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets })
    })
    .catch(e => console.error('Error syncing tickets to SQLite', e));
  }, [tickets, hasFetchedInitial]);

  useEffect(() => {
    if (!hasFetchedInitial) return;
    const json = JSON.stringify(guiches);
    if (json === lastFetchedRef.current.guiches) return;
    lastFetchedRef.current.guiches = json;
    localStorage.setItem('sga_neo_guiches', json);
    
    lastPostedRef.current.guiches = Date.now();
    fetch('/api/guiches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guiches })
    })
    .catch(e => console.error('Error syncing guiches to SQLite', e));
  }, [guiches, hasFetchedInitial]);

  useEffect(() => {
    if (!hasFetchedInitial) return;
    const json = JSON.stringify(history);
    if (json === lastFetchedRef.current.history) return;
    lastFetchedRef.current.history = json;
    localStorage.setItem('sga_neo_history', json);
    
    lastPostedRef.current.history = Date.now();
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history })
    })
    .catch(e => console.error('Error syncing history to SQLite', e));
  }, [history, hasFetchedInitial]);

  useEffect(() => {
    if (!hasFetchedInitial) return;
    const json = JSON.stringify(categories);
    if (json === lastFetchedRef.current.categories) return;
    lastFetchedRef.current.categories = json;
    localStorage.setItem('sga_neo_categories', json);
    
    lastPostedRef.current.categories = Date.now();
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories })
    })
    .catch(e => console.error('Error syncing categories to SQLite', e));
  }, [categories, hasFetchedInitial]);

  useEffect(() => {
    if (!hasFetchedInitial) return;
    if (isMuted === lastFetchedRef.current.isMuted) return;
    lastFetchedRef.current.isMuted = isMuted;
    localStorage.setItem('sga_neo_muted', isMuted ? 'true' : 'false');
    fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'sga_neo_muted', value: isMuted ? 'true' : 'false' })
    }).catch(e => console.error('Error syncing isMuted to SQLite', e));
  }, [isMuted, hasFetchedInitial]);

  useEffect(() => {
    if (!hasFetchedInitial) return;
    if (vocalizeAllLetters === lastFetchedRef.current.vocalizeAllLetters) return;
    lastFetchedRef.current.vocalizeAllLetters = vocalizeAllLetters;
    localStorage.setItem('sga_neo_vocalize', vocalizeAllLetters ? 'true' : 'false');
    fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'sga_neo_vocalize', value: vocalizeAllLetters ? 'true' : 'false' })
    }).catch(e => console.error('Error syncing vocalizeAllLetters to SQLite', e));
  }, [vocalizeAllLetters, hasFetchedInitial]);

  // ----------------------------------------------------
  // SSI Queue Router Helper (Priority queue scheduling FIFO)
  // ----------------------------------------------------
  const getNextTicketForDesk = (desk: Guiche, activeTickets: Ticket[]): Ticket | null => {
    // Collect all waiting tickets
    const waiting = activeTickets.filter(t => t.status === 'waiting');
    if (waiting.length === 0) return null;

    // Filter categories handled by this specific desk
    const applicableWaiting = waiting.filter(t => desk.categoryFocus.includes(t.category.id));
    if (applicableWaiting.length === 0) return null;

    // SSI Standard Algorithm: Pull priority ('prioritario' or prefix P) before General, sorting FIFO.
    const priorityTickets = applicableWaiting.filter(t => t.category.id === 'prioritario');
    
    if (priorityTickets.length > 0) {
      // Return oldest priority ticket
      return priorityTickets.reduce((oldest, current) => current.createdAt < oldest.createdAt ? current : oldest);
    }

    // Otherwise, return the oldest standard/applicable ticket
    return applicableWaiting.reduce((oldest, current) => current.createdAt < oldest.createdAt ? current : oldest);
  };

  // ----------------------------------------------------
  // User Accounts & Authentication Helpers
  // ----------------------------------------------------
  const handleRegisterUser = (newUser: UserAccount): boolean => {
    const exists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (exists) return false;

    setUsers(prev => [...prev, newUser]);
    
    // If the registered user preassigned a guiche AND is approved, auto link them to it
    if (newUser.isApproved !== false && newUser.role === 'attendant' && newUser.guicheNumber) {
      const guicheNum = newUser.guicheNumber;
      setGuiches(prev => prev.map(g => {
        if (g.number === guicheNum) {
          return { ...g, attendantName: newUser.name };
        }
        return g;
      }));
    }
    return true;
  };

  const handleRemoveUser = (userId: string) => {
    // Prevent removing logged in self to avoid locking oneself out
    if (currentUser && currentUser.id === userId) return;

    // Find user to see if they were linked to a guiche
    const user = users.find(u => u.id === userId);
    if (user) {
      setGuiches((prev) => 
        prev.map((g) => {
          if (g.attendantName === user.name) {
            return { ...g, attendantName: undefined, status: 'offline' };
          }
          return g;
        })
      );
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleApproveUser = (userId: string) => {
    setUsers((prev) => 
      prev.map((u) => {
        if (u.id === userId) {
          const approvedUser = { ...u, isApproved: true };
          if (approvedUser.role === 'attendant' && approvedUser.guicheNumber) {
            const guicheNum = approvedUser.guicheNumber;
            setGuiches(gPrev => gPrev.map(g => {
              if (g.number === guicheNum) {
                return { ...g, attendantName: approvedUser.name };
              }
              return g;
            }));
          }
          return approvedUser;
        }
        return u;
      })
    );
  };

  const handleAssociateUserWithGuiche = (userId: string, guicheNumber: number | null) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, guicheNumber: guicheNumber || undefined };
      }
      if (guicheNumber && u.guicheNumber === guicheNumber) {
        return { ...u, guicheNumber: undefined };
      }
      return u;
    }));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, guicheNumber: guicheNumber || undefined } : null);
    }

    if (guicheNumber) {
      setGuiches(prev => {
        const exists = prev.some(g => g.number === guicheNumber);
        if (exists) {
          return prev.map(g => {
            if (g.number === guicheNumber) {
              return {
                ...g,
                attendantName: targetUser.name,
              };
            }
            return g;
          });
        } else {
          const newGuiche: Guiche = {
            id: `guiche_dyn_${Date.now()}_${guicheNumber}`,
            number: guicheNumber,
            attendantName: targetUser.name,
            currentTicket: null,
            status: 'idle',
            categoryFocus: ['geral', 'prioritario', 'rapido', 'exclusivo'],
            isCallingAnimation: false,
          };
          return [...prev, newGuiche].sort((a, b) => a.number - b.number);
        }
      });
    }
  };

  // ----------------------------------------------------
  // Client Desk Operations / Business Rules
  // ----------------------------------------------------
  const emitTicket = (categoryId: string): Ticket => {
    const category = categories.find(c => c.id === categoryId) || categories[0];
    
    // Calculate safe sequential number starting from 1 every day
    const prefix = category.prefix;
    const samePrefixActive = tickets.filter(t => t.category.prefix === prefix);
    
    // Only search today's history records
    const todayStr = new Date().toDateString();
    const samePrefixHist = history.filter(h => {
      const isSamePrefix = h.categoryPrefix === prefix;
      const isToday = new Date(h.timestamp).toDateString() === todayStr;
      return isSamePrefix && isToday;
    });
    
    const activeMax = samePrefixActive.reduce((max, t) => Math.max(max, t.number), 0);
    const histMax = samePrefixHist.reduce((max, h) => {
      const codeNum = parseInt(h.code.substring(2));
      return isNaN(codeNum) ? max : Math.max(max, codeNum);
    }, 0);
    
    const nextNum = Math.max(activeMax, histMax) + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');
    const code = `${prefix}-${paddedNum}`;

    const newTicket: Ticket = {
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      number: nextNum,
      code,
      category,
      createdAt: Date.now(),
      status: 'waiting',
    };

    setTickets((prev) => [...prev, newTicket]);
    return newTicket;
  };

  const handleToggleOnline = (guicheId: string) => {
    setGuiches((prev) => 
      prev.map((g) => {
        if (g.id === guicheId) {
          const wasOffline = g.status === 'offline';
          return {
            ...g,
            status: wasOffline ? 'idle' : 'offline',
            currentTicket: null // reset ticket if they sign out
          };
        }
        return g;
      })
    );
  };

  const handleCallNext = (guicheId: string): Ticket | null => {
    const desk = guiches.find(g => g.id === guicheId);
    if (!desk || desk.status === 'offline') return null;

    const nextTicket = getNextTicketForDesk(desk, tickets);
    if (!nextTicket) return null;

    // Update tickets array
    setTickets((prev) => 
      prev.map((t) => 
        t.id === nextTicket.id 
          ? { 
              ...t, 
              status: 'called', 
              calledAt: Date.now(), 
              guicheNumber: desk.number, 
              attendantName: desk.attendantName 
            } 
          : t
      )
    );

    // Update Desk operator state
    setGuiches((prev) => 
      prev.map((g) => 
        g.id === guicheId 
          ? { 
              ...g, 
              status: 'calling', 
              currentTicket: {
                ...nextTicket,
                status: 'called',
                calledAt: Date.now(),
                guicheNumber: desk.number,
                attendantName: desk.attendantName
              } 
            } 
          : g
      )
    );

    // Audio effects
    if (!isMuted) {
      playChime();
      setTimeout(() => speakTicket(nextTicket.code, desk.number, vocalizeAllLetters), 600);
    }

    return nextTicket;
  };

  const handleRecall = (guicheId: string) => {
    const desk = guiches.find(g => g.id === guicheId);
    if (!desk || !desk.currentTicket) return;

    // Trigger visual flash
    setGuiches((prev) => 
      prev.map((g) => g.id === guicheId ? { ...g, currentTicket: { ...g.currentTicket!, calledAt: Date.now() } } : g)
    );

    // Audio effects
    if (!isMuted) {
      playChime();
      setTimeout(() => speakTicket(desk.currentTicket!.code, desk.number, vocalizeAllLetters), 600);
    }
  };

  const handleStartService = (guicheId: string) => {
    const desk = guiches.find(g => g.id === guicheId);
    if (!desk || !desk.currentTicket) return;

    setTickets((prev) => 
      prev.map((t) => t.id === desk.currentTicket?.id ? { ...t, status: 'serving', servingStartedAt: Date.now() } : t)
    );

    setGuiches((prev) => 
      prev.map((g) => 
        g.id === guicheId 
          ? { 
              ...g, 
              status: 'serving', 
              currentTicket: {
                ...g.currentTicket!,
                status: 'serving',
                servingStartedAt: Date.now()
              } 
            } 
          : g
      )
    );
  };

  const handleCompleteService = (guicheId: string, rating: number) => {
    const desk = guiches.find(g => g.id === guicheId);
    if (!desk || !desk.currentTicket) return;

    const ticket = desk.currentTicket;
    const waitSec = Math.floor(((ticket.calledAt || Date.now()) - ticket.createdAt) / 1000);
    const serviceSec = Math.floor((Date.now() - (ticket.servingStartedAt || Date.now())) / 1000);

    // Write audit record
    const newRecord: HistoricalRecord = {
      id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: ticket.code,
      categoryName: ticket.category.name,
      categoryPrefix: ticket.category.prefix,
      waitTimeSec: Math.max(1, waitSec),
      serviceTimeSec: Math.max(1, serviceSec),
      status: 'completed',
      guicheNumber: desk.number,
      attendantName: desk.attendantName,
      timestamp: Date.now(),
      rating,
    };

    // Remove from active queue & update desk
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    setHistory((prev) => [newRecord, ...prev]);
    setGuiches((prev) => 
      prev.map((g) => g.id === guicheId ? { ...g, status: 'idle', currentTicket: null } : g)
    );
  };

  const handleNoShow = (guicheId: string) => {
    const desk = guiches.find(g => g.id === guicheId);
    if (!desk || !desk.currentTicket) return;

    const ticket = desk.currentTicket;
    const waitSec = Math.floor(((ticket.calledAt || Date.now()) - ticket.createdAt) / 1000);

    // Write audit record
    const newRecord: HistoricalRecord = {
      id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: ticket.code,
      categoryName: ticket.category.name,
      categoryPrefix: ticket.category.prefix,
      waitTimeSec: Math.max(1, waitSec),
      serviceTimeSec: 0,
      status: 'no_show',
      guicheNumber: desk.number,
      attendantName: desk.attendantName,
      timestamp: Date.now(),
    };

    // Remove from active queue & update desk
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    setHistory((prev) => [newRecord, ...prev]);
    setGuiches((prev) => 
      prev.map((g) => g.id === guicheId ? { ...g, status: 'idle', currentTicket: null } : g)
    );
  };

  const handleTransferTicket = (guicheId: string, targetCategoryId: string) => {
    const desk = guiches.find(g => g.id === guicheId);
    if (!desk || !desk.currentTicket) return;

    const ticket = desk.currentTicket;
    const targetCategory = categories.find((c) => c.id === targetCategoryId) || categories[0];

    // Build the transferred ticket sequence (keeping original wait factor or placing at front)
    const prefix = targetCategory.prefix;
    const samePrefixActive = tickets.filter(t => t.category.prefix === prefix);
    const samePrefixHist = history.filter(h => h.categoryPrefix === prefix);
    
    const activeMax = samePrefixActive.reduce((max, t) => Math.max(max, t.number), 0);
    const histMax = samePrefixHist.reduce((max, h) => {
      const codeNum = parseInt(h.code.substring(2));
      return isNaN(codeNum) ? max : Math.max(max, codeNum);
    }, 0);
    
    const nextNum = Math.max(activeMax, histMax) + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');
    const code = `${prefix}-${paddedNum}`;

    const transferredTicket: Ticket = {
      id: `t_tf_${Date.now()}`,
      number: nextNum,
      code,
      category: targetCategory,
      createdAt: Date.now() - 5 * 60 * 1000, // backdate slightly so they get quick queue routing priority!
      status: 'waiting',
    };

    // Log the previous ticket as completed/redirected on the old booth
    const serviceSec = Math.floor((Date.now() - (ticket.servingStartedAt || Date.now())) / 1000);
    const waitSec = Math.floor(((ticket.calledAt || Date.now()) - ticket.createdAt) / 1000);
    const oldAudit: HistoricalRecord = {
      id: `h_tf_log_${Date.now()}`,
      code: ticket.code,
      categoryName: `${ticket.category.name} (Tf)`,
      categoryPrefix: ticket.category.prefix,
      waitTimeSec: waitSec,
      serviceTimeSec: serviceSec,
      status: 'completed',
      guicheNumber: desk.number,
      attendantName: desk.attendantName,
      timestamp: Date.now(),
    };

    // Update pool
    setTickets((prev) => [...prev.filter((t) => t.id !== ticket.id), transferredTicket]);
    setHistory((prev) => [oldAudit, ...prev]);
    setGuiches((prev) => 
      prev.map((g) => g.id === guicheId ? { ...g, status: 'idle', currentTicket: null } : g)
    );
  };

  const handleToggleCategoryFocus = (guicheId: string, categoryId: string) => {
    setGuiches((prev) => 
      prev.map((g) => {
        if (g.id === guicheId) {
          const hasCat = g.categoryFocus.includes(categoryId);
          const newFocus = hasCat 
            ? g.categoryFocus.filter(id => id !== categoryId) 
            : [...g.categoryFocus, categoryId];
          
          return {
            ...g,
            categoryFocus: newFocus
          };
        }
        return g;
      })
    );
  };

  // ----------------------------------------------------
  // Helper Actions & Simulation Resets
  // ----------------------------------------------------
  const handleClearHistory = () => {
    setHistory([]);
    setTickets([]);
    setGuiches(INITIAL_GUICHES.map(g => ({
      ...g,
      status: g.attendantName ? 'idle' : 'offline',
      currentTicket: null
    })));
  };

  const handleDailyClose = () => {
    // 1. Convert active queues into historical logs to protect stats metrics
    const unresolvedTickets: HistoricalRecord[] = [];
    const now = Date.now();
    
    tickets.forEach(t => {
      if (t.status === 'waiting' || t.status === 'called' || t.status === 'serving') {
        const waitSec = Math.floor((now - t.createdAt) / 1000);
        unresolvedTickets.push({
          id: `h_close_${t.id}_${now}`,
          code: t.code,
          categoryName: t.category.name,
          categoryPrefix: t.category.prefix,
          waitTimeSec: waitSec > 0 ? waitSec : 120,
          serviceTimeSec: t.status === 'serving' ? 240 : 0,
          status: 'no_show', // archive unresolved ones as no_show
          guicheNumber: t.guicheNumber || 1,
          attendantName: t.attendantName || 'Atendimento Expirado',
          timestamp: t.createdAt, // keep creation timestamp for accurate daily stats grouping
        });
      }
    });

    if (unresolvedTickets.length > 0) {
      setHistory((prev) => [...unresolvedTickets, ...prev]);
    }

    // 2. Clear all active queues for the new day
    setTickets([]);

    // 3. Reset workstation logins/tickets
    setGuiches((prev) => 
      prev.map((g) => ({
        ...g,
        status: g.attendantName ? 'idle' : 'offline',
        currentTicket: null,
        isCallingAnimation: false
      }))
    );
  };

  const handleAddSimulatedHistory = () => {
    const mockSeed = generateInitialHistory();
    setHistory((prev) => [...mockSeed, ...prev]);
  };

  // Extract called tickets for painel
  const calledTicketsList = tickets
    .filter(t => t.status === 'called' || t.status === 'serving')
    .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0));

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Upper Navigation Admin header bar */}
      <nav className={`print:hidden border-b ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} sticky top-0 z-40 shadow-xs backdrop-blur-md bg-opacity-95`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <img 
                src="https://www.image2url.com/r2/default/images/1779981932562-d2de0374-3977-40b0-8e2e-3201ada7e644.png" 
                alt="Logo Iteraima" 
                className="h-11 w-11 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-sans font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    SSI
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded-full font-bold font-mono uppercase">
                    v2.1
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider">SISTEMA DE SENHA ITERAIMA</p>
              </div>
            </div>

            {/* Application role view Tabs list */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl">
              
              <button
                onClick={() => setActiveTab('atendimento')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'atendimento' 
                    ? 'bg-blue-600 dark:bg-blue-600 shadow-md text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Atendimento (Guichê)
              </button>

              <button
                onClick={() => setActiveTab('integrated')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'integrated' 
                    ? 'bg-blue-600 dark:bg-blue-600 shadow-md text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {currentUser ? (
                  <LayoutGrid className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-500 animate-pulse shrink-0" />
                )}
                Modo Unificado
              </button>

              <button
                onClick={() => setActiveTab('panel')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'panel' 
                    ? 'bg-blue-600 dark:bg-blue-600 shadow-md text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Monitor TV (Painel)
              </button>

              <button
                onClick={() => setActiveTab('totem')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'totem' 
                    ? 'bg-blue-600 dark:bg-blue-600 shadow-md text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {currentUser ? (
                  <Printer className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-500 animate-pulse shrink-0" />
                )}
                Totem Triagem
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'stats' 
                    ? 'bg-blue-600 dark:bg-blue-600 shadow-md text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {currentUser?.role === 'supervisor' ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-500 animate-pulse" />
                )}
                Indicadores e SLA
              </button>

              <button
                onClick={() => setActiveTab('auth')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'auth' 
                    ? 'bg-blue-600 dark:bg-blue-600 shadow-md text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Operadores / Login
              </button>
            </div>

            {/* Theme switcher, sound toggle */}
            <div className="flex items-center gap-2.5">
              
              {/* Theme Toggle Button */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-400 dark:text-slate-300"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Actionable information banner */}
      {showDemoBanner && (
        <div id="demo-banner" className="print:hidden bg-gradient-to-r from-blue-600 via-indigo-650 to-blue-700 text-white px-6 py-3 shadow-md flex items-center justify-between text-xs sm:text-sm font-sans">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-300 animate-pulse" />
            <span>
              <strong>Dica do Painel:</strong> Use as abas superiores para acessar o <strong>Monitor TV (Painel)</strong> no saguão, o <strong>Totem de Triagem</strong> para emissão de senhas ou a tela de <strong>Atendimento</strong>.
            </span>
          </div>
          <button 
            onClick={() => setShowDemoBanner(false)}
            className="text-white hover:text-white/80 font-bold bg-white/20 px-2.5 py-1 rounded hover:bg-white/30 transition text-xs ml-4"
          >
            Fechar Dica
          </button>
        </div>
      )}

      {/* Sub-nav row for mobile tab viewers */}
      <div className="flex md:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('atendimento')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${activeTab === 'atendimento' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}
        >
          Atendimento
        </button>
        <button
          onClick={() => setActiveTab('integrated')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 ${activeTab === 'integrated' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}
        >
          {!currentUser && <Lock className="w-2.5 h-2.5 text-amber-500 animate-pulse shrink-0" />}
          Geral
        </button>
        <button
          onClick={() => setActiveTab('panel')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${activeTab === 'panel' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}
        >
          Monitor TV (Painel)
        </button>
        <button
          onClick={() => setActiveTab('totem')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 ${activeTab === 'totem' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}
        >
          {!currentUser && <Lock className="w-2.5 h-2.5 text-amber-500 animate-pulse shrink-0" />}
          Totem Triagem
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 ${activeTab === 'stats' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}
        >
          {currentUser?.role !== 'supervisor' && <Lock className="w-2.5 h-2.5 text-amber-500 animate-pulse" />}
          Estatísticas
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${activeTab === 'auth' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}
        >
          Operadores
        </button>
      </div>

      {/* Main Core View Area according to Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 0: EXCLUSIVE SOLO OPERATOR ATTENDANCE TERMINAL */}
        {activeTab === 'atendimento' && (
          <AtendimentoSolo
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            users={users}
            onRegisterUser={handleRegisterUser}
            onRemoveUser={handleRemoveUser}
            onApproveUser={handleApproveUser}
            guiches={guiches}
            onAssociateUserWithGuiche={handleAssociateUserWithGuiche}
            waitingTickets={tickets}
            categories={categories}
            onToggleOnline={handleToggleOnline}
            onCallNext={handleCallNext}
            onRecall={handleRecall}
            onStartService={handleStartService}
            onCompleteService={handleCompleteService}
            onNoShow={handleNoShow}
            onTransferTicket={handleTransferTicket}
            onToggleCategoryFocus={handleToggleCategoryFocus}
          />
        )}

        {/* TAB 1: INTEGRATED LAYOUT (Complete Bank lobby simulation screen) */}
        {activeTab === 'integrated' && (
          !currentUser ? (
            <div className="max-w-xl mx-auto py-4">
              <div className="mb-5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black tracking-widest font-mono uppercase bg-white/20 px-2 py-0.5 rounded">ACESSO PROTEGIDO</span>
                  <h1 className="text-xl font-bold tracking-tight text-white mt-1.5">Área Restrita SSI</h1>
                  <p className="text-xs text-white/80 mt-1">
                    Para visualizar o painel integrado de filas em tempo real, registre-se ou acesse utilizando seu login funcional.
                  </p>
                </div>
                <Lock className="w-10 h-10 stroke-[1.2] opacity-80" />
              </div>
              <AuthManager
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                users={users}
                onRegisterUser={handleRegisterUser}
                onRemoveUser={handleRemoveUser}
                onApproveUser={handleApproveUser}
                guiches={guiches}
                onAssociateUserWithGuiche={handleAssociateUserWithGuiche}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
            
            {/* Quick queue sizing counters banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Aguardando Fila</span>
                  <span className="text-2xl font-black font-mono text-blue-600">{tickets.filter(t => t.status === 'waiting').length}</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg text-blue-600 dark:text-blue-300 font-bold text-xs">
                  SLA Espera
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Atendidos Hoje</span>
                  <span className="text-2xl font-black font-mono text-emerald-600">{history.filter(h => h.status === 'completed').length}</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg text-emerald-600 dark:text-emerald-300 font-bold text-xs">
                  Eficiência
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Guichês Online</span>
                  <span className="text-2xl font-black font-mono text-indigo-650 dark:text-indigo-400">{guiches.filter(g => g.status !== 'offline').length} / {guiches.length}</span>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                  Canais
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Nível SAT Fila</span>
                  <span className="text-2xl font-black font-mono text-amber-500">
                    {history.filter(h => h.status === 'completed').length > 0 
                      ? (history.filter(h => h.status === 'completed' && h.rating).reduce((acc, h) => acc + (h.rating || 0), 0) / Math.max(1, history.filter(h => h.status === 'completed' && h.rating).length)).toFixed(1)
                      : '4.9'
                    } ★
                  </span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg text-amber-600 dark:text-amber-300 font-bold text-xs">
                  CSAT Fila
                </div>
              </div>
            </div>

            {/* Split row setup: Panel, Totem, Desks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (Lg: 8 / 12) - TV Monitor & Totem Dispenser */}
              <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
                
                {/* TV Monitor Block */}
                <div>
                  <PanelMonitor
                    calledTickets={calledTicketsList}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    vocalizeAllLetters={vocalizeAllLetters}
                    setVocalizeAllLetters={setVocalizeAllLetters}
                    onPlayChime={playChime}
                  />
                </div>

                {/* Totem Dispenser Block */}
                <div>
                  <TicketDispenser
                    categories={categories}
                    waitingTickets={tickets}
                    onEmitTicket={emitTicket}
                    onUpdateCategories={setCategories}
                  />
                </div>

              </div>

              {/* Right Column (Lg: 5 / 12) - Guiches operators */}
              <div className="col-span-1 lg:col-span-5">
                <DeskOperator
                  guiches={guiches}
                  waitingTickets={tickets}
                  categories={categories}
                  onToggleOnline={handleToggleOnline}
                  onCallNext={handleCallNext}
                  onRecall={handleRecall}
                  onStartService={handleStartService}
                  onCompleteService={handleCompleteService}
                  onNoShow={handleNoShow}
                  onTransferTicket={handleTransferTicket}
                  onToggleCategoryFocus={handleToggleCategoryFocus}
                />
              </div>

            </div>

            {/* Bottom Section - Full audit and analytics */}
            <div>
              <DashboardStats
                history={history}
                categories={categories}
                currentUser={currentUser}
                reports={reports}
                onSaveReport={handleSaveReport}
                onDeleteReport={handleDeleteReport}
                onClearHistory={handleClearHistory}
                onAddSimulatedHistory={handleAddSimulatedHistory}
                onDailyClose={handleDailyClose}
              />
            </div>

          </div>
          )
        )}

        {/* TAB 2: FULL TV SCREEN MONITOR */}
        {activeTab === 'panel' && (
          <div className="max-w-5xl mx-auto py-4">
            <div className="mb-4 flex justify-between items-center bg-slate-100 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-830">
              <span className="text-xs font-semibold text-slate-505 dark:text-slate-400">Modo de Exibição dedicado para Tela do saguão de atendimento (TV)</span>
              <button 
                onClick={() => setActiveTab('integrated')}
                className="text-xs px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 text-blue-600 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
              >
                Voltar ao Sistema
              </button>
            </div>
            <PanelMonitor
              calledTickets={calledTicketsList}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              vocalizeAllLetters={vocalizeAllLetters}
              setVocalizeAllLetters={setVocalizeAllLetters}
              onPlayChime={playChime}
            />
          </div>
        )}

        {/* TAB 3: FULL TABLET TOTEM DISPENSER */}
        {activeTab === 'totem' && (
          !currentUser ? (
            <div className="max-w-xl mx-auto py-4">
              <div className="mb-5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black tracking-widest font-mono uppercase bg-white/20 px-2 py-0.5 rounded">ACESSO PROTEGIDO</span>
                  <h1 className="text-xl font-bold tracking-tight text-white mt-1.5">Acesso Restrito: Totem Triagem</h1>
                  <p className="text-xs text-white/80 mt-1">
                    Para acessar o Totem Autoatendimento para emissão de senhas, registre-se ou acesse utilizando seu login funcional.
                  </p>
                </div>
                <Lock className="w-10 h-10 stroke-[1.2] opacity-80" />
              </div>
              <AuthManager
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                users={users}
                onRegisterUser={handleRegisterUser}
                onRemoveUser={handleRemoveUser}
                onApproveUser={handleApproveUser}
                guiches={guiches}
                onAssociateUserWithGuiche={handleAssociateUserWithGuiche}
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-4">
              <div className="mb-4 flex justify-between items-center bg-slate-100 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-830">
                <span className="text-xs font-semibold text-slate-505 dark:text-slate-400">Modo de Exibição Totem de Senhas (Autoatendimento)</span>
                <button 
                  onClick={() => setActiveTab('integrated')}
                  className="text-xs px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 text-blue-600 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
                >
                  Voltar ao Sistema
                </button>
              </div>
              <TicketDispenser
                categories={categories}
                waitingTickets={tickets}
                onEmitTicket={emitTicket}
                onUpdateCategories={setCategories}
              />
            </div>
          )
        )}

        {/* TAB 4: HISTORIC STATS ANALYTICS ONLY */}
        {activeTab === 'stats' && (
          <div className="max-w-6xl mx-auto py-4 flex flex-col gap-6">
            <div className="print:hidden flex justify-between items-center bg-slate-100 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-830">
              <span className="text-xs font-semibold text-slate-505 dark:text-slate-400">Métricas consolidadas de SLA e Auditoria de Senha</span>
              <button 
                onClick={() => setActiveTab('integrated')}
                className="text-xs px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 text-blue-600 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
              >
                Voltar ao Sistema
              </button>
            </div>
            {currentUser?.role === 'supervisor' ? (
              <DashboardStats
                history={history}
                categories={categories}
                currentUser={currentUser}
                reports={reports}
                onSaveReport={handleSaveReport}
                onDeleteReport={handleDeleteReport}
                onClearHistory={handleClearHistory}
                onAddSimulatedHistory={handleAddSimulatedHistory}
                onDailyClose={handleDailyClose}
              />
            ) : (
              <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-6 flex flex-col items-center gap-5 text-center my-6">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-3.5 rounded-full text-amber-600 dark:text-amber-400 border border-amber-200/50">
                  <Lock className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Painel Restrito a Supervisores</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                    O acompanhamento das métricas de SLA do Iteraima, auditoria de senhas e dados consolidados é exclusivo para supervisores credenciados.
                  </p>
                </div>

                {currentUser && (
                  <div className="w-full bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                    <p className="text-slate-600 dark:text-slate-400 leading-tight">
                      Você está logado como: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> ({currentUser.role === 'attendant' ? 'Atendente' : currentUser.role})
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-450 font-semibold mt-1">
                      Sua conta atual não possui privilégios para visualizar este painel.
                    </p>
                  </div>
                )}

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStatsLockError('');
                    const emailClean = statsLockEmail.trim().toLowerCase();
                    const found = users.find(u => 
                      (u.email.toLowerCase() === emailClean || 
                       u.name.toLowerCase() === emailClean || 
                       u.id.toLowerCase() === emailClean) && 
                      u.password === statsLockPassword
                    );
                    if (found) {
                      if (found.role !== 'supervisor') {
                        setStatsLockError('Sua conta está cadastrada como Atendente. Apenas supervisores podem acessar.');
                        return;
                      }
                      if (found.isApproved === false) {
                        setStatsLockError('Sua conta de supervisor está pendente de aprovação.');
                        return;
                      }
                      setCurrentUser(found);
                      setStatsLockEmail('');
                      setStatsLockPassword('');
                    } else {
                      setStatsLockError('E-mail ou senha de supervisor incorretos.');
                    }
                  }}
                  className="w-full space-y-4 text-left"
                >
                  {statsLockError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 rounded-xl text-[11px] font-medium border border-rose-100 dark:border-rose-900 flex items-center gap-1.5 leading-snug">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{statsLockError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase font-bold font-mono text-slate-400 dark:text-slate-550 tracking-wider block mb-1">E-mail ou Usuário Supervisor</label>
                    <input
                      type="text"
                      value={statsLockEmail}
                      onChange={(e) => setStatsLockEmail(e.target.value)}
                      placeholder="admin@iteraima.rr.gov.br ou ssi_user"
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold font-mono text-slate-400 dark:text-slate-555 tracking-wider block mb-1">Senha Privada</label>
                    <input
                      type="password"
                      value={statsLockPassword}
                      onChange={(e) => setStatsLockPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-98 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Elevar Privilégios & Desbloquear
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MANAGED AUTH, LOGIN AND REGISTRATION CONTROLS */}
        {activeTab === 'auth' && (
          <div className="max-w-xl mx-auto py-4 flex flex-col gap-6">
            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">Portal do Operador • Registro de Attendants</span>
              <button 
                onClick={() => setActiveTab('integrated')}
                className="text-xs px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 text-blue-600 rounded-lg border border-slate-200 shadow-xs cursor-pointer font-semibold"
              >
                Voltar ao Painel
              </button>
            </div>
            <AuthManager
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              users={users}
              onRegisterUser={handleRegisterUser}
              onRemoveUser={handleRemoveUser}
              onApproveUser={handleApproveUser}
              guiches={guiches}
              onAssociateUserWithGuiche={handleAssociateUserWithGuiche}
            />
          </div>
        )}

      </main>

      {/* Elegant minimalist platform Footer info */}
      <footer className="mt-16 py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-mono">
        <p>© 2026 SSI • Sistema de Senha Iteraima - Instituto de Terras de Roraima.</p>
        <p className="mt-1 text-slate-500">Desenvolvido com React, Tailwind CSS e Web Speech Synthesis.</p>
      </footer>
    </div>
  );
}
