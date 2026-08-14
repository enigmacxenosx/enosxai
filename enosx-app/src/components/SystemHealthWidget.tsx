import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSystemHealth } from '@/hooks/useSystemHealth';

export default function SystemHealthWidget() {
  const { config } = useTheme();
  const { speedMbps, history, status } = useSystemHealth();

  const getStatusColor = () => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'degraded': return '#eab308';
      case 'offline': return '#ef4444';
      default: return config.accent;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online': return <Wifi size={16} />;
      case 'degraded': return <AlertTriangle size={16} />;
      case 'offline': return <WifiOff size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg"
            style={{ background: `${getStatusColor()}20`, color: getStatusColor() }}
          >
            {getStatusIcon()}
          </div>
          <span className="text-xs font-bold tracking-wider uppercase opacity-70" style={{ color: config.text }}>
            System Health
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="text-[10px] font-medium uppercase" style={{ color: config.textMuted }}>
            {status}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tracking-tighter" style={{ color: config.text }}>
            {speedMbps !== null ? speedMbps.toFixed(1) : '---'}
          </span>
          <span className="text-[10px] font-bold opacity-50 uppercase" style={{ color: config.text }}>
            Mbps
          </span>
        </div>
        <p className="text-[10px] mt-0.5 opacity-60" style={{ color: config.textMuted }}>
          Real-time network throughput
        </p>
      </div>

      {/* Mini Sparkline */}
      <div className="h-8 w-full mt-3 flex items-end gap-[2px]">
        {history.slice(-20).map((sample, i) => {
          const height = Math.min(100, (sample.speedMbps / 100) * 100);
          return (
            <motion.div
              key={sample.timestamp}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              className="flex-1 rounded-t-[1px]"
              style={{ 
                height: `${Math.max(10, height)}%`, 
                backgroundColor: getStatusColor(),
                opacity: 0.3 + (i / 20) * 0.7,
                originY: 1
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
