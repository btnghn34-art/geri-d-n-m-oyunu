import React from 'react';
import { WasteItemData, WasteType } from '../types';
import { Milk, Wine, Hammer } from 'lucide-react';

interface Props {
  item: WasteItemData;
  onPointerDown: (id: number, e: React.PointerEvent) => void;
}

const WasteItem: React.FC<Props> = ({ item, onPointerDown }) => {
  const getIcon = () => {
    switch (item.type) {
      case WasteType.PLASTIC:
        return <Milk className="w-8 h-8 text-yellow-700" />;
      case WasteType.GLASS:
        return <Wine className="w-8 h-8 text-green-700" />;
      case WasteType.METAL:
        return <Hammer className="w-8 h-8 text-slate-700" />;
    }
  };

  const getColorClass = () => {
    switch (item.type) {
      case WasteType.PLASTIC:
        return 'bg-yellow-300 border-yellow-500';
      case WasteType.GLASS:
        return 'bg-green-300 border-green-500';
      case WasteType.METAL:
        return 'bg-slate-300 border-slate-500';
    }
  };

  return (
    <div
      onPointerDown={(e) => onPointerDown(item.id, e)}
      className={`absolute w-14 h-14 rounded-full border-4 flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing touch-none select-none transition-transform ${item.isDragging ? 'scale-125 z-50' : 'scale-100 z-10'} ${getColorClass()}`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: 'translate(-50%, -50%)', // Center the item on coordinates
      }}
    >
      {getIcon()}
    </div>
  );
};

export default WasteItem;
