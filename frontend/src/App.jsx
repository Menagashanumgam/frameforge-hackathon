import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Upload,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  Zap,
  Box,
  BarChart3,
  Clock,
  ShieldCheck,
  Loader2,
  FileVideo,
  Monitor,
  Cpu,
  Layers,
  ChevronRight,
  Download
} from 'lucide-react';

const App = () => {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [backendStatus, setBackendStatus] = useState('checking');
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get('http://localhost:5000/health');
        setBackendStatus('connected');
      } catch (err) {
        setBackendStatus('disconnected');
      }
    };
    checkHealth();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setReport(null);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReport(response.data);
    } catch (err) {
      console.error(err);
      alert('Forensics bridge failed. Check Python environmental dependencies.');
    } finally {
      setLoading(false);
    }
  };

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [report]);

  const activeErrors = useMemo(() => {
    if (!report?.errors) return [];
    return report.errors.filter(err => Math.abs(err.timestamp - currentTime) < 0.8);
  }, [report, currentTime]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[140px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl">
        <div className="max-w-[1700px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10">
                <ShieldCheck className="text-cyan-400 w-7 h-7" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
                SPECTRE <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent italic">OS</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">Temporal Forensics Engine</span>
                <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-cyan-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />

            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium text-sm"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              {file ? file.name : 'Ingest Media'}
            </button>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`relative group overflow-hidden px-8 py-2.5 rounded-xl font-bold text-sm tracking-wider transition-all
                ${(!file || loading) ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' : 'bg-cyan-500 text-slate-950 hover:scale-105 active:scale-95'}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSING BUFFER...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  INITIATE SCAN
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1700px] mx-auto p-8 pt-6">
        {!report && !loading && (
          <div className="flex flex-col items-center justify-center h-[75vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative p-16 rounded-[40px] border border-white/5 bg-slate-900/20 backdrop-blur-3xl overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-50" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-slate-800 flex items-center justify-center border border-white/10 group-hover:border-cyan-500/50 transition-all duration-500">
                  <FileVideo className="w-12 h-12 text-slate-400 group-hover:text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Await Media Ingestion</h2>
                <p className="text-slate-400 text-center max-w-sm font-medium leading-relaxed">
                  The system is ready for high-fidelity temporal analysis. Ingest any MP4/MOV source to begin forensics.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-[75vh] space-y-12">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-cyan-500/10 rounded-full" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-cyan-400 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              />
              <Activity className="absolute inset-0 m-auto w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-white tracking-[0.3em] uppercase mb-2">Quantizing Sequence</h2>
              <p className="text-cyan-500/50 font-mono text-xs tracking-widest uppercase">Executing Dense Optical Flow Algorithm</p>
            </div>
          </div>
        )}

        {report && (
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left Section: Viewport & Analytics */}
            <div className="col-span-8 space-y-8">
              {/* Main Viewport */}
              <div className="relative group p-1 bg-gradient-to-br from-white/10 to-transparent rounded-[32px] shadow-2xl overflow-hidden border border-white/5">
                <div className="absolute inset-0 bg-slate-950 rounded-[30px]" />
                <video ref={videoRef} src={report.videoUrl} controls className="relative z-10 w-full h-auto rounded-[28px] aspect-video bg-black shadow-inner" />

                {/* HUD ALERTS */}
                <AnimatePresence>
                  {activeErrors.length > 0 && (
                    <motion.div
                      key="hud-alert"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="absolute top-8 right-8 z-20 space-y-3"
                    >
                      {activeErrors.map((err, i) => (
                        <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-[#7f1d1d]/40 backdrop-blur-2xl border border-red-500/40 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                          <Zap className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/80 mb-0.5">Anomaly Detected</p>
                            <p className="text-sm font-bold">{err.type} at {err.timestamp.toFixed(2)}s</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Analytics Chart */}
              <div className="p-8 rounded-[32px] bg-slate-900/30 border border-white/5 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Motion Intelligence Stream</h3>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      Optical Flow Magnitude
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500/30 border border-blue-500" />
                      Frame Clarity
                    </div>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.analytics}>
                      <defs>
                        <linearGradient id="colorMotion" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <XAxis hide dataKey="timestamp" />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        itemStyle={{ color: '#22d3ee', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="motion_score" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorMotion)" />
                      <Area type="monotone" dataKey="blur_score" stroke="#3b82f6" strokeWidth={1} fillOpacity={0.05} strokeDasharray="5 5" fill="#3b82f6" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Section: Telemetry & Summary */}
            <div className="col-span-4 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <MiniStat label="Health Score" value={`${report.summary.health_score}%`} icon={<ShieldCheck />} color="text-cyan-400" />
                <MiniStat label="Anomalies" value={report.summary.error_count} icon={<AlertTriangle />} color={report.summary.error_count > 0 ? "text-amber-500" : "text-emerald-500"} />
              </div>

              {/* Logs */}
              <div className="bg-slate-900/40 rounded-[32px] border border-white/5 backdrop-blur-xl flex flex-col h-[600px] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-bold text-white text-sm uppercase tracking-tighter">Forensic Event Log</h3>
                  </div>
                  <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <Download className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {report.errors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <CheckCircle2 className="w-16 h-16 mb-4 opacity-10" />
                      <p className="text-[10px] uppercase font-black tracking-[0.3em]">Temporal Integrity Secure</p>
                    </div>
                  ) : (
                    report.errors.map((err, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          videoRef.current.currentTime = err.timestamp;
                          videoRef.current.play();
                        }}
                        className="group flex items-start gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-cyan-500/20 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${err.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${err.severity === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {err.type === 'Frame Drop' ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black font-mono text-cyan-400">T+{err.timestamp.toFixed(3)}s</span>
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">FRAME {err.frame}</span>
                          </div>
                          <p className="text-sm font-bold text-white truncate">{err.type}</p>
                          <p className="text-xs text-slate-400 leading-tight mt-1 line-clamp-2">{err.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-700 mt-auto mb-auto" />
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="p-6 bg-slate-950/40 border-t border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">
                    <span>Forensic Scan Summary</span>
                    <span className="text-cyan-500">{report.summary.processed_frames} Frames Analyzed</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Processing Time</span>
                      <span className="text-white font-mono font-bold">{report.summary.processing_time}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Source FPS</span>
                      <span className="text-white font-mono font-bold">{report.summary.fps.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const MiniStat = ({ label, value, icon, color }) => (
  <div className="p-6 rounded-[28px] bg-slate-900/40 border border-white/5 backdrop-blur-xl group hover:border-cyan-500/30 transition-all flex flex-col items-center text-center">
    <div className={`w-12 h-12 mb-4 rounded-2xl bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">{label}</p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);

export default App;
