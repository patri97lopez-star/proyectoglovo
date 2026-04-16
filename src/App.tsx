import React, { useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  AlertCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  Calendar,
  BarChart3,
  Info,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Incident, ZoneStats } from './types';
import { analyzeIncidents } from './services/geminiService';

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showRefundSuccess, setShowRefundSuccess] = useState(false);

  // Form state
  const [newType, setNewType] = useState<Incident['type']>('delayed');
  const [newZone, setNewZone] = useState('Centro');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('initial-incidents', (data: Incident[]) => {
      setIncidents(data);
    });

    newSocket.on('new-incident', (incident: Incident) => {
      setIncidents(prev => [incident, ...prev]);
      if (incident.type === 'refund') {
        setShowRefundSuccess(true);
        setTimeout(() => setShowRefundSuccess(false), 5000);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => inc.timestamp.startsWith(selectedDate));
  }, [incidents, selectedDate]);

  const zoneStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredIncidents.forEach(inc => {
      stats[inc.zone] = (stats[inc.zone] || 0) + 1;
    });
    return Object.entries(stats).map(([zone, count]) => ({
      zone,
      count,
    }));
  }, [filteredIncidents]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    incidents.forEach(inc => dates.add(inc.timestamp.split('T')[0]));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [incidents]);

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const incident = {
      type: newType,
      zone: newZone,
      description: newDesc,
    };

    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });

    setNewDesc('');
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeIncidents(incidents);
    setAiAnalysis(result || '');
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Success Toast for Refunds */}
      <AnimatePresence>
        {showRefundSuccess && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-glovo-green text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <div className="bg-white/20 p-1.5 rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              ¡LA DEVOLUCIÓN DEL DINERO HA SIDO CORRECTA!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-glovo-yellow px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-glovo-black text-glovo-yellow p-2 rounded-lg font-bold text-xl tracking-tighter">
            GLOVO OPS
          </div>
          <div className="h-6 w-[1px] bg-glovo-black/20 mx-2" />
          <h1 className="font-medium text-glovo-black/80">Centro de Operaciones en Tiempo Real</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full text-xs font-semibold text-glovo-green border border-glovo-green/20">
            <div className="w-2 h-2 bg-glovo-green rounded-full animate-pulse" />
            SISTEMA ACTIVO
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Left Column: Real-time Feed */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-glovo-yellow fill-glovo-yellow" />
                <h2 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Incidencias "En Caliente"</h2>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400">LIVE</span>
              </div>
            </div>

            {/* Persistent Input Form */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <form onSubmit={handleAddIncident} className="space-y-3">
                <div className="flex gap-2">
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value as any)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-glovo-yellow transition-all appearance-none cursor-pointer"
                  >
                    <option value="delayed">🕒 RETRASADO</option>
                    <option value="failed">❌ FALLIDO</option>
                    <option value="claim">💬 RECLAMACIÓN</option>
                    <option value="refund">💰 DEVOLUCIÓN</option>
                  </select>
                  <select 
                    value={newZone} 
                    onChange={e => setNewZone(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-glovo-yellow transition-all appearance-none cursor-pointer"
                  >
                    <option value="Centro">📍 Centro</option>
                    <option value="Salamanca">📍 Salamanca</option>
                    <option value="Chamberí">📍 Chamberí</option>
                    <option value="Retiro">📍 Retiro</option>
                    <option value="Arganzuela">📍 Arganzuela</option>
                    <option value="Tetuán">📍 Tetuán</option>
                  </select>
                </div>
                <div className="relative">
                  <textarea 
                    placeholder="Escribe aquí la incidencia operativa..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-glovo-yellow h-24 resize-none transition-all shadow-inner"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={!newDesc.trim()}
                    className="absolute bottom-3 right-3 bg-glovo-black text-white p-2 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-30 disabled:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {incidents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <CheckCircle2 className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No hay incidencias activas</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {incidents.map((incident) => (
                    <motion.div
                      key={incident.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          incident.type === 'delayed' ? "bg-orange-100 text-orange-600" :
                          incident.type === 'failed' ? "bg-red-100 text-red-600" :
                          incident.type === 'refund' ? "bg-green-100 text-green-600" :
                          "bg-purple-100 text-purple-600"
                        )}>
                          {incident.type === 'refund' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {incident.type}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 truncate">{incident.description}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {incident.zone}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </section>

          {/* AI Insights Card */}
          <section className="bg-glovo-black text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col min-h-[200px]">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-glovo-yellow" />
                  <h2 className="font-bold">Análisis de IA</h2>
                </div>
                <button 
                  onClick={runAiAnalysis}
                  disabled={isAnalyzing}
                  className="bg-glovo-yellow text-glovo-black px-3 py-1 rounded-full text-xs font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                >
                  {isAnalyzing && <div className="w-3 h-3 border-2 border-glovo-black border-t-transparent rounded-full animate-spin" />}
                  {isAnalyzing ? 'Analizando...' : 'Actualizar'}
                </button>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {isAnalyzing ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-5/6" />
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {aiAnalysis || "Haz clic en 'Actualizar' para que la IA analice las incidencias actuales y proporcione recomendaciones operativas."}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-glovo-yellow/5 rounded-full blur-3xl" />
          </section>
        </div>

        {/* Middle Column: Daily Summary & Charts */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-glovo-green" />
                <h2 className="font-bold text-slate-800">Resumen Diario por Zona</h2>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-glovo-green appearance-none cursor-pointer"
                >
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {date === new Date().toISOString().split('T')[0] ? 'HOY' : date}
                    </option>
                  ))}
                </select>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="h-[300px] w-full">
              {zoneStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="zone" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {zoneStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#FFC244' : '#00A082'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <BarChart3 className="w-12 h-12 opacity-10" />
                  <p className="text-sm font-medium">Sin datos para esta fecha</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Incidencias del Día</p>
                <p className="text-2xl font-bold text-slate-800">{filteredIncidents.length}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Zona Crítica</p>
                <p className="text-2xl font-bold text-slate-800">
                  {zoneStats.length > 0 ? zoneStats.sort((a, b) => b.count - a.count)[0].zone : '-'}
                </p>
              </div>
            </div>
          </section>

          {/* Strategy Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-800">Estrategia de Automatización</h2>
            </div>
            
            <div className="space-y-4">
              <div className="border-l-4 border-glovo-yellow pl-4 py-1">
                <h3 className="text-sm font-bold text-slate-800 mb-1">A) Flujo "En Caliente" (Incidencias)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-glovo-black">Disparador:</span> <span className="bg-orange-100 text-orange-700 px-1 rounded">EVENTO</span>. 
                  Cada vez que un pedido cambia a estado "retrasado" o un repartidor reporta fallo, se emite un evento vía WebSockets.
                  <br/>
                  <span className="font-bold text-glovo-black">Riesgo:</span> Tormenta de eventos en horas pico que puede saturar el dashboard o los sistemas de notificación.
                </p>
              </div>

              <div className="border-l-4 border-glovo-green pl-4 py-1">
                <h3 className="text-sm font-bold text-slate-800 mb-1">B) Resumen Diario (Operaciones)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-glovo-black">Disparador:</span> <span className="bg-green-100 text-green-700 px-1 rounded">CRON / POLLING</span>. 
                  Un proceso programado a las 23:59 consolida los datos de la base de datos transaccional a la analítica.
                  <br/>
                  <span className="font-bold text-glovo-black">Riesgo:</span> Latencia en la toma de decisiones estratégicas si ocurre un problema sistémico temprano en el día que no se detecta hasta el resumen.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                <div className="flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-800 mb-1">Mitigación de Riesgos</h4>
                    <ul className="text-[10px] text-blue-700 list-disc list-inside space-y-1">
                      <li>Implementar "Backpressure" en el flujo de eventos.</li>
                      <li>Sistemas de Sharding por zona para el procesamiento de resúmenes.</li>
                      <li>Alertas de umbral (Thresholds) para convertir resúmenes en eventos críticos.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Operational Status & Tips */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-sm">Estado de Flotas</h2>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-glovo-green rounded-full animate-ping" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">Real-time</span>
              </div>
            </div>
            <div className="space-y-5">
              {['Centro', 'Salamanca', 'Chamberí', 'Retiro', 'Arganzuela', 'Tetuán'].map(zone => {
                const zoneCount = incidents.filter(i => i.zone === zone).length;
                const stressLevel = Math.min(zoneCount * 20, 100); // 5 incidents = 100% stress
                const status = stressLevel > 70 ? 'CRÍTICO' : stressLevel > 30 ? 'ALTO' : 'NORMAL';
                const barColor = stressLevel > 70 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 
                                 stressLevel > 30 ? 'bg-gradient-to-r from-orange-400 to-glovo-yellow' : 
                                 'bg-gradient-to-r from-glovo-green to-emerald-400';

                return (
                  <div key={zone} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-600 group-hover:text-glovo-black transition-colors">{zone}</span>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded",
                        status === 'CRÍTICO' ? "bg-red-100 text-red-600" :
                        status === 'ALTO' ? "bg-orange-100 text-orange-600" :
                        "bg-green-100 text-glovo-green"
                      )}>
                        {status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(stressLevel, 5)}%` }}
                          transition={{ type: 'spring', stiffness: 50 }}
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            barColor,
                            stressLevel > 0 && "animate-flow"
                          )}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-6 text-right">
                        {zoneCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-glovo-yellow/10 border border-glovo-yellow/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-glovo-yellow fill-glovo-yellow" />
              <h2 className="font-bold text-glovo-black text-sm">Tip Operativo</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed italic">
              "Durante picos de lluvia en Barcelona, priorizar el flujo de EVENTOS para reasignar flotas de zonas de baja demanda a zonas críticas de entrega fallida."
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-400 text-[10px] border-t border-slate-100 mt-auto">
        &copy; 2026 Glovo Operations Center &bull; Sistema de Monitoreo Automatizado &bull; v2.4.0
      </footer>
    </div>
  );
}
