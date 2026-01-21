import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WasteType, WasteItemData } from './types';
import WasteItem from './components/WasteItem';
import Bin from './components/Bin';
import { playSound } from './utils/sound';
import { Play, RotateCcw, Trophy, Clock, Target } from 'lucide-react';

// Game Constants
const GAME_DURATION = 60;
const SPAWN_INTERVAL_START = 1500;
const MIN_SPAWN_INTERVAL = 600;
const GRAVITY_START = 0.3; // % screen height per frame (approx)
const BIN_HEIGHT_PERCENT = 20; // Bottom 20% is bin area
const ITEM_RADIUS_PERCENT = 5; // Rough hitbox size

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState<WasteItemData[]>([]);
  
  // Refs for game loop (avoiding closure staleness)
  const itemsRef = useRef<WasteItemData[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const dragItemRef = useRef<{ id: number; startX: number; pointerX: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync refs with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Spawn Logic
  const spawnItem = useCallback(() => {
    const types = [WasteType.PLASTIC, WasteType.GLASS, WasteType.METAL];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = Date.now() + Math.random();
    
    // Spawn at random X (10% to 90% to stay on screen)
    const x = 10 + Math.random() * 80;
    
    // Increase difficulty over time
    const progress = (GAME_DURATION - timeLeft) / GAME_DURATION;
    const currentSpeed = GRAVITY_START + (progress * 0.4); 

    const newItem: WasteItemData = {
      id,
      type,
      x,
      y: -10, // Start slightly above screen
      speed: currentSpeed,
      isDragging: false,
    };

    setItems(prev => {
      const next = [...prev, newItem];
      itemsRef.current = next;
      return next;
    });
  }, [timeLeft]);

  // Main Game Loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameStateRef.current !== 'PLAYING') return;

    // Spawning
    const currentSpawnInterval = Math.max(
      MIN_SPAWN_INTERVAL, 
      SPAWN_INTERVAL_START - ((GAME_DURATION - timeLeft) * 20)
    );
    
    if (timestamp - lastSpawnTimeRef.current > currentSpawnInterval) {
      spawnItem();
      lastSpawnTimeRef.current = timestamp;
    }

    // Moving & Collision
    setItems(prevItems => {
      const nextItems: WasteItemData[] = [];
      let scoreChange = 0;

      prevItems.forEach(item => {
        // If dragging, X is controlled by pointer, Y still falls but maybe slower? 
        // Let's keep Y falling normally to maintain pressure.
        let newY = item.y + item.speed;
        
        // If item hits the bottom bin area (approx > 85% Y)
        if (newY > (100 - BIN_HEIGHT_PERCENT + ITEM_RADIUS_PERCENT)) {
          // Check collision with bins
          // Bins are: 0-33% (Plastic), 33-66% (Glass), 66-100% (Metal)
          let targetBin: WasteType | null = null;
          if (item.x < 33.33) targetBin = WasteType.PLASTIC;
          else if (item.x < 66.66) targetBin = WasteType.GLASS;
          else targetBin = WasteType.METAL;

          if (targetBin === item.type) {
            scoreChange += 10;
            playSound('correct');
          } else {
            scoreChange -= 5;
            playSound('wrong');
          }
          // Remove item (don't add to nextItems)
          return;
        }

        nextItems.push({ ...item, y: newY });
      });

      if (scoreChange !== 0) {
        setScore(s => s + scoreChange);
      }

      itemsRef.current = nextItems;
      return nextItems;
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [timeLeft, spawnItem]);

  // Timer Effect
  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('GAMEOVER');
            playSound('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [gameState, timeLeft]);

  // Start/Stop Loop
  useEffect(() => {
    if (gameState === 'PLAYING') {
      lastSpawnTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, gameLoop]);

  // Interaction Handlers
  const handlePointerDown = (id: number, e: React.PointerEvent) => {
    if (gameState !== 'PLAYING') return;
    
    // Calculate initial offset or just snap center to pointer?
    // Snapping center feels better for fast arcade games.
    const container = containerRef.current;
    if (!container) return;

    container.setPointerCapture(e.pointerId);

    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isDragging: true } : item
    ));
    
    dragItemRef.current = { id, startX: 0, pointerX: e.clientX };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragItemRef.current || gameState !== 'PLAYING') return;
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Clamp X
    const clampedX = Math.max(5, Math.min(95, xPercent));

    setItems(prev => prev.map(item => 
      item.id === dragItemRef.current?.id ? { ...item, x: clampedX } : item
    ));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragItemRef.current) return;
    
    const id = dragItemRef.current.id;
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isDragging: false } : item
    ));
    dragItemRef.current = null;
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setItems([]);
    setGameState('PLAYING');
    playSound('correct'); // Just a start sound
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-sm shadow-sm z-30 flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-500 w-6 h-6" />
          <span className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="flex flex-col items-center">
             <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Geri Dönüşüm Avcısı</h1>
        </div>
        <div className="flex items-center gap-2">
          <Target className="text-orange-500 w-6 h-6" />
          <span className="text-3xl font-black text-slate-800">{score}</span>
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={containerRef}
        className="relative flex-1 bg-gradient-to-b from-sky-100 to-sky-50 touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Drop Hints/Guide Lines */}
        <div className="absolute inset-0 flex pointer-events-none opacity-10">
          <div className="flex-1 border-r border-slate-400 border-dashed"></div>
          <div className="flex-1 border-r border-slate-400 border-dashed"></div>
          <div className="flex-1"></div>
        </div>

        {/* Falling Items */}
        {items.map(item => (
          <WasteItem 
            key={item.id} 
            item={item} 
            onPointerDown={handlePointerDown} 
          />
        ))}

        {/* Bins Zone (Visual indicator of where to drop) */}
        <div className="absolute bottom-0 w-full h-[20%] flex z-20 shadow-2xl">
           <Bin type={WasteType.PLASTIC} highlight={false} />
           <Bin type={WasteType.GLASS} highlight={false} />
           <Bin type={WasteType.METAL} highlight={false} />
        </div>
      </div>

      {/* Menu Overlay */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6">
          <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center transform transition-all animate-[bounce_1s_infinite]">
            <div className="flex justify-center mb-6">
                <div className="p-4 bg-green-100 rounded-full">
                    <Trophy className="w-16 h-16 text-green-600" />
                </div>
            </div>
            <h1 className="text-4xl font-black mb-2 text-green-600">Geri Dönüşüm<br/>Avcısı</h1>
            <p className="text-slate-500 mb-8 font-medium">
              Atıkları yakala, doğru kutuya sürükle!<br/>
              <span className="text-sm opacity-75">Plastik (Sarı), Cam (Yeşil), Metal (Gri)</span>
            </p>
            <button 
              onClick={startGame}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3"
            >
              <Play fill="currentColor" />
              OYUNA BAŞLA
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-6">
          <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <h2 className="text-3xl font-bold mb-2 text-slate-800">Oyun Bitti!</h2>
            <div className="my-8">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Toplam Skor</span>
              <div className="text-6xl font-black text-green-600 mt-2">{score}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                <div className="bg-slate-100 p-3 rounded-xl">
                    <div className="font-bold text-green-600">+10</div>
                    <div className="text-slate-400">Doğru</div>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl">
                    <div className="font-bold text-red-500">-5</div>
                    <div className="text-slate-400">Yanlış</div>
                </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3"
            >
              <RotateCcw />
              TEKRAR OYNA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
