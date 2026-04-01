import { Zap, Compass, Banknote, Users, Heart, MessageCircle } from 'lucide-react';
import { Persona } from '../types';

interface PersonaLoaderProps {
  persona: Persona;
  contextualMessage?: string;
}

export function PersonaLoader({ persona, contextualMessage }: PersonaLoaderProps) {
  const loaders: Record<string, { icon: React.ReactNode; text: string; animation: string }> = {
    "The Electron Explorer": {
      icon: <Zap className="text-[#2979FF] animate-pulse" size={48} />,
      text: "Optimizing charging stops...",
      animation: "animate-bounce"
    },
    "The Solo Nomad": {
      icon: <Compass className="text-slate-700 animate-[spin_3s_linear_infinite]" size={48} />,
      text: "Finding the path less traveled...",
      animation: "animate-pulse"
    },
    "The Value Voyager": {
      icon: <Banknote className="text-emerald-600 animate-[bounce_1s_infinite]" size={48} />,
      text: "Hunting for high-value detours...",
      animation: "animate-pulse"
    },
    "Kinship Krew": {
      icon: <Users className="text-indigo-600 animate-bounce" size={48} />,
      text: "Gathering family-friendly gems...",
      animation: "animate-pulse"
    },
    "Duo Discoverers": {
      icon: <Heart className="text-rose-500 animate-ping" size={48} />,
      text: "Setting the scene for two...",
      animation: "animate-pulse"
    },
    "Social Syndicate": {
      icon: <MessageCircle className="text-amber-500 animate-spin" size={48} />,
      text: "Syncing the group's adventure...",
      animation: "animate-pulse"
    },
    // Fallbacks for versions without "The"
    "Electron Explorer": {
      icon: <Zap className="text-[#2979FF] animate-pulse" size={48} />,
      text: "Optimizing charging stops...",
      animation: "animate-bounce"
    },
    "Solo Nomad": {
      icon: <Compass className="text-slate-700 animate-[spin_3s_linear_infinite]" size={48} />,
      text: "Finding the path less traveled...",
      animation: "animate-pulse"
    },
    "Value Voyager": {
      icon: <Banknote className="text-emerald-600 animate-[bounce_1s_infinite]" size={48} />,
      text: "Hunting for high-value detours...",
      animation: "animate-pulse"
    }
  };

  const active = loaders[persona] || loaders["The Solo Nomad"];

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8 py-12">
      <div className={`p-8 bg-white/80 backdrop-blur-xl rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] border border-white/50 ${active.animation}`}>
        {active.icon}
      </div>
      <div className="text-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Architecting</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{contextualMessage || active.text}</p>
        <div className="flex justify-center gap-1 mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
