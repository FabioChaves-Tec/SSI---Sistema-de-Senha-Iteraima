/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { Volume2, VolumeX, Tv, Clock, Megaphone, HelpCircle, Maximize2, Minimize2 } from 'lucide-react';

interface PanelMonitorProps {
  calledTickets: Ticket[];
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  vocalizeAllLetters: boolean;
  setVocalizeAllLetters: (vocalize: boolean) => void;
  onPlayChime: () => void;
}

export default function PanelMonitor({
  calledTickets,
  isMuted,
  setIsMuted,
  vocalizeAllLetters,
  setVocalizeAllLetters,
  onPlayChime,
}: PanelMonitorProps) {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const handleUnlockAudio = () => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    // Play the chime to unlock HTML5 browser Audio Context
    onPlayChime();
    // Play a short silent TTS to activate browser Web SpeechSynthesis
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const whisper = new SpeechSynthesisUtterance('áudio ativado');
        whisper.lang = 'pt-BR';
        whisper.volume = 0; // completely silent
        window.speechSynthesis.speak(whisper);
      } catch (e) {
        console.warn('Speech synthesis unlock whisper failed:', e);
      }
    }
  };
  
  const mainTicket = calledTickets[0] || null;
  const historyTickets = calledTickets.slice(1, 5); // next 4 previous

  // Sync fullscreen state if changed externally (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    const element = document.getElementById('panel-monitor-root');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // News ticker items to mimic a professional lobby display
  const tickerItems = [
    "SSI: Bem-vindo ao sistema de atendimento inteligente mais moderno.",
    "Atenção prioritária garantida por lei para gestantes, idosos e PCD.",
    "Evite filas: use nosso aplicativo parceiro para pré-agendamento.",
    "Mantenha seus documentos em mãos para acelerar seu atendimento.",
    "Avalie nosso atendimento no totem após a conclusão da sua senha!"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Flash ticket code whenever the main ticket changes
  useEffect(() => {
    if (mainTicket) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [mainTicket?.id, mainTicket?.calledAt]);

  const getCategoryColor = (prefix: string) => {
    switch (prefix) {
      case 'P': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'S': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'R': return 'bg-sky-100 text-sky-950 border-sky-300';
      default: return 'bg-emerald-100 text-emerald-950 border-emerald-300';
    }
  };

  return (
    <div 
      id="panel-monitor-root" 
      onClick={handleUnlockAudio}
      className={`bg-slate-950 text-white overflow-hidden flex flex-col h-full transition-all duration-300 relative ${
        isFullscreen 
          ? 'w-full h-screen rounded-none border-0' 
          : 'rounded-2xl shadow-2xl border-4 border-slate-800 min-h-[500px]'
      }`}
    >
      {!audioUnlocked && (
        <div className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-bold cursor-pointer text-center animate-pulse transition-all border-b border-amber-600 z-50 shadow-lg">
          <div className="flex items-center gap-2.5 mx-auto">
            <Volume2 className="w-5 h-5 animate-bounce shrink-0 text-slate-950" />
            <div>
              <span>⚠️ ATENÇÃO: CLIQUE UMA ÚNICA VEZ NESTA TELA PARA ATIVAR O SOM E A VOZ DO PAINEL!</span>
              <span className="block text-[10px] font-normal text-slate-900 mt-0.5">Após a primeira ativação, as chamadas falarão sozinhas automaticamente sem precisar clicar novamente.</span>
            </div>
          </div>
          <span className="bg-slate-950 text-white text-[10px] uppercase font-mono px-3 py-1.5 rounded-lg shrink-0">
            ATIVAR ÁUDIO
          </span>
        </div>
      )}
      
      {/* Panel Header */}
      <div id="panel-header" className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg animate-pulse">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans tracking-tight text-slate-100">PAINEL DE SENHAS</h2>
            <p className="text-xs text-slate-400 font-mono">MONITOR DE ESPERA PRINCIPAL</p>
          </div>
        </div>
        
        {/* Panel Preferences */}
        <div className="flex items-center gap-3">
          {/* Fullscreen Toggle */}
          <button
            id="fullscreen-toggle"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-lg border border-slate-700 transition cursor-pointer font-sans font-semibold"
            title={isFullscreen ? "Sair da Tela Inteira" : "Modo Tela Inteira"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Sair Tela Inteira</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Tela Inteira</span>
              </>
            )}
          </button>

          {/* Vocalization type toggle */}
          <button 
            id="vocalization-toggle"
            onClick={() => setVocalizeAllLetters(!vocalizeAllLetters)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-300 border border-slate-700 transition"
            title="Altera como o robô fala a senha (Soletrada ou Número corrido)"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Voz: <span className="font-semibold text-white">{vocalizeAllLetters ? "Soletrar" : "Normal"}</span>
          </button>

          {/* Test chime */}
          <button
            id="test-chime"
            onClick={onPlayChime}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Testar Campainha"
          >
            <Megaphone className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button 
            id="sound-on-off"
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              isMuted 
                ? 'bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800' 
                : 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden md:inline">Sem Voz</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span className="hidden md:inline">Com Áudio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Areas split 2/3 and 1/3 */}
      <div id="panel-content" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* Left 7 Columns: Big Ticket Callout */}
        <div id="panel-main-display" className="lg:col-span-8 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/70 to-slate-950">
          
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase font-mono tracking-widest bg-slate-900 px-3 py-1 rounded-full">Chamada Atual</span>
            <div id="live-indicator" className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">ATIVO</span>
            </div>
          </div>

          {mainTicket ? (
            <div id="main-ticket-card" className="my-auto flex flex-col items-center justify-center p-8 text-center">
              {/* Highlight call ring */}
              <div className={`relative px-12 py-10 rounded-3xl border transition-all duration-500 bg-slate-900 w-full max-w-md ${
                pulse 
                  ? 'border-blue-500 ring-8 ring-blue-500/20 scale-102 bg-blue-950/20 shadow-[0_0_50px_rgba(59,130,246,0.3)]' 
                  : 'border-slate-800'
              }`}>
                {/* Category tag */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-md ${getCategoryColor(mainTicket.category.prefix)}`}>
                    {mainTicket.category.name}
                  </span>
                </div>

                {/* Ultimate Giant Ticket Number */}
                <div id="called-ticket-code" className={`text-7xl sm:text-8xl md:text-9xl font-extrabold font-mono tracking-tight select-none mt-2 ${
                  pulse ? 'text-blue-400 animate-pulse' : 'text-slate-100'
                }`}>
                  {mainTicket.code}
                </div>

                <div className="w-16 h-1 bg-slate-800 mx-auto my-6 rounded-full"></div>

                {/* Local Guiché info */}
                <div className="text-sm font-mono text-slate-400 uppercase tracking-wide">Dirija-se ao</div>
                <div id="called-ticket-desk" className={`text-3xl md:text-5xl font-extrabold text-blue-500 mt-2 flex items-center justify-center gap-2 ${
                  pulse ? 'animate-bounce' : ''
                }`}>
                  GUICHÊ {mainTicket.guicheNumber}
                </div>

                {/* Attendant label */}
                <div className="text-xs text-slate-500 font-sans mt-3">Atendente: <span className="text-slate-300 font-medium">{mainTicket.attendantName}</span></div>
              </div>
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Megaphone className="w-16 h-16 text-slate-700 stroke-[1.2] mb-4 animate-pulse" />
              <p className="text-lg font-medium text-slate-400">Nenhuma senha chamada ainda</p>
              <p className="text-sm text-slate-600 mt-2 max-w-sm">Use o Atendimento ao lado para chamar o próximo cliente na fila de espera.</p>
            </div>
          )}

          {/* Tips / Instructions helper context */}
          <div className="text-[11px] text-slate-500 italic flex items-center gap-1 bg-slate-900/50 p-2.5 rounded-lg border border-slate-900">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Este painel reproduz chime e fala no alto-falante. Ative o áudio acima.</span>
          </div>
        </div>

        {/* Right 4 Columns: History of past calls */}
        <div id="panel-history" className="lg:col-span-4 bg-slate-950 p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase border-b border-slate-800 pb-2 mb-3">Últimas Chamadas</h3>
            
            <div id="panel-history-list" className="flex flex-col gap-3">
              {historyTickets.length > 0 ? (
                historyTickets.map((ticket, idx) => (
                  <div
                    key={`${ticket.id}-${ticket.calledAt}`}
                    className="flex justify-between items-center p-3 bg-slate-900 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono tracking-tight text-slate-200">{ticket.code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold font-sans">
                          {ticket.category.prefix}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                        Guichê {ticket.guicheNumber} • {ticket.attendantName?.split(' ')[0]}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono text-blue-500 font-extrabold uppercase">
                        G{ticket.guicheNumber}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-mono">
                        {new Date(ticket.calledAt || 0).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-600">
                  Histórico de chamadas vazio.
                </div>
              )}
            </div>
          </div>

          {/* Clock view inside panel */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between font-mono text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="text-slate-300 font-semibold text-sm">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling News Ticker at bottom */}
      <div id="panel-ticker" className="bg-blue-900 px-4 py-2 border-t border-blue-950 flex items-center overflow-hidden">
        <span className="bg-blue-950 text-white text-[10px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded shrink-0 mr-3 animate-pulse">AVISO</span>
        <div className="flex-1 whitespace-nowrap overflow-hidden relative">
          <div className="inline-block transition-transform duration-1000 ease-in-out font-sans text-xs text-blue-100 font-medium">
            {tickerItems[tickerIndex]}
          </div>
        </div>
      </div>
    </div>
  );
}
