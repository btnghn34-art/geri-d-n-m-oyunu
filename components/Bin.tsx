import React from 'react';
import { WasteType } from '../types';
import { Recycle } from 'lucide-react';

interface Props {
  type: WasteType;
  highlight: boolean;
}

const Bin: React.FC<Props> = ({ type, highlight }) => {
  const getConfig = () => {
    switch (type) {
      case WasteType.PLASTIC:
        return {
          label: 'PLASTİK',
          color: 'bg-yellow-500',
          borderColor: 'border-yellow-700',
          textColor: 'text-yellow-100',
        };
      case WasteType.GLASS:
        return {
          label: 'CAM',
          color: 'bg-green-600',
          borderColor: 'border-green-800',
          textColor: 'text-green-100',
        };
      case WasteType.METAL:
        return {
          label: 'METAL',
          color: 'bg-slate-500',
          borderColor: 'border-slate-700',
          textColor: 'text-slate-100',
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`relative h-full flex-1 flex flex-col items-center justify-end pb-4 border-t-8 ${config.color} ${config.borderColor} transition-all duration-200 ${highlight ? 'brightness-125 scale-105' : ''}`}
    >
      <div className="absolute top-4 opacity-20">
        <Recycle size={64} className={config.textColor} />
      </div>
      <span className={`text-xl font-black tracking-widest ${config.textColor} z-10`}>
        {config.label}
      </span>
    </div>
  );
};

export default Bin;
