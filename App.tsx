import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
type ItemType = 'PLASTIC' | 'GLASS' | 'METAL';

interface GameItem {
  id: string;
  type: ItemType;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  speed: number;
  el: HTMLDivElement | null;
}

// --- Constants ---
const TYPES: ItemType[] = ['PLASTIC', 'GLASS', 'METAL'];
const GAME_DURATION = 60;

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  
  // Refs for game loop logic to avoid re-renders
  const itemsRef = useRef<GameItem[]>([]);
  const requestRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const worldRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const draggedItemRef = useRef<GameItem | null>(null);

  // --- Audio Helper ---
  const playSound = useCallback((type: 'correct' | 'wrong' | 'gameover') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'gameover') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(100, now + 1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    }
  }, []);

  // --- Game Loop ---
  const spawnItem = useCallback(() => {
    if (!worldRef.current) return;
    
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const id = `item-${Date.now()}-${Math.random()}`;
    const startX = 10 + Math.random() * 80;

    // Create DOM Element manually for performance
    const el = document.createElement('div');
    el.className = `absolute w-14 h-14 rounded-full border-4 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-10 touch-none select-none transition-transform active:scale-125`;
    
    // Style based on type
    let iconSvg = '';
    if (type === 'PLASTIC') {
      el.classList.add('bg-yellow-300', 'border-yellow-500');
      iconSvg = '<svg class="w-8 h-8 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v10Z"/><path d="M12 3v6"/></svg>';
    } else if (type === 'GLASS') {
      el.classList.add('bg-green-300', 'border-green-500');
      iconSvg = '<svg class="w-8 h-8 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>';
    } else {
      el.classList.add('bg-slate-300', 'border-slate-500');
      iconSvg = '<svg class="w-8 h-8 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>';
    }
    el.innerHTML = iconSvg;
    el.style.left = `${startX}%`;
    el.style.top = `-10%`;
    
    // Setup Item Object
    const newItem: GameItem = {
      id,
      type,
      x: startX,
      y: -10,
      speed: 0.2 + (Math.random() * 0.1) + ((60 - timeLeft) * 0.005), // Increase difficulty
      el
    };

    // Attach Event Listeners for Dragging
    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      draggedItemRef.current = newItem;
      el.setPointerCapture(e.pointerId);
      el.style.zIndex = '50';
    };
    el.addEventListener('pointerdown', handlePointerDown);

    // Mount to DOM
    worldRef.current.appendChild(el);
    itemsRef.current.push(newItem);

  }, [timeLeft]);

  const animate = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;

    // Spawning
    const spawnRate = Math.max(500, 1500 - ((60 - timeLeft) * 20));
    if (time - lastSpawnRef.current > spawnRate) {
      spawnItem();
      lastSpawnRef.current = time;
    }

    // Moving Items
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      
      // Fall Logic
      if (draggedItemRef.current !== item) {
        item.y += item.speed;
      } else {
        item.y += item.speed * 0.3; // Slower fall when dragging
      }

      // Update Visual Position
      if (item.el) {
        item.el.style.top = `${item.y}%`;
      }

      // Collision / Scoring Logic (at bottom)
      if (item.y > 85) {
        let targetBin: ItemType;
        if (item.x < 33.3) targetBin = 'PLASTIC';
        else if (item.x < 66.6) targetBin = 'GLASS';
        else targetBin = 'METAL';

        const isCorrect = targetBin === item.type;
        
        if (isCorrect) {
          scoreRef.current += 10;
          playSound('correct');
          highlightBin(targetBin, 'correct');
        } else {
          scoreRef.current -= 5;
          playSound('wrong');
          highlightBin(targetBin, 'wrong');
        }
        setScore(scoreRef.current);

        // Cleanup
        if (item.el && worldRef.current) {
          item.el.remove();
        }
        itemsRef.current.splice(i, 1);
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, timeLeft, spawnItem, playSound]);

  const highlightBin = (type: ItemType, result: 'correct' | 'wrong') => {
    const id = type === 'PLASTIC' ? 'bin-plastic' : type === 'GLASS' ? 'bin-glass' : 'bin-metal';
    const el = document.getElementById(id);
    if (el) {
      const cls = result === 'correct' ? 'brightness-125' : 'bg-red-500';
      el.classList.add(cls, 'scale-105');
      setTimeout(() => el.classList.remove(cls, 'scale-105'), 200);
    }
  };

  // --- Effects ---

  // Timer
  useEffect(() => {
    let timerId: any;
    if (gameState === 'PLAYING') {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('GAMEOVER');
            playSound('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [gameState, playSound]);

  // Animation Loop
  useEffect(() => {
    if (gameState === 'PLAYING') {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, animate]);

  // Global Pointer Events for Dragging
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!draggedItemRef.current || !worldRef.current) return;
      e.preventDefault();
      
      const rect = worldRef.current.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      
      draggedItemRef.current.x = Math.max(5, Math.min(95, xPercent));
      if (draggedItemRef.current.el) {
        draggedItemRef.current.el.style.left = `${draggedItemRef.current.x}%`;
      }
    };

    const handleUp = () => {
      if (draggedItemRef.current && draggedItemRef.current.el) {
        draggedItemRef.current.el.style.zIndex = '10';
      }
      draggedItemRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  const startGame = () => {
    // Reset state
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setGameState('PLAYING');
    itemsRef.current = [];
    if (worldRef.current) {
      // Keep only guidelines
      const guidelines = worldRef.current.querySelector('.guidelines');
      worldRef.current.innerHTML = '';
      if (guidelines) worldRef.current.appendChild(guidelines);
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 h-screen w-screen overflow-hidden font-sans select-none">
      <script src="https://cdn.tailwindcss.com"></script>
      
      {/* Game Container */}
      <div className="relative w-full h-full flex flex-col">
        
        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-sm z-30 flex justify-between items-center px-6 shadow-sm">
          <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="text-2xl font-bold font-mono">{timeLeft}</span>
          </div>
          <div className="text-center hidden sm:block">
            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Geri Dönüşüm Avcısı</h1>
          </div>
          <div className="flex items-center gap-2 text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <span className="text-3xl font-black font-mono">{score}</span>
          </div>
        </div>

        {/* Game World */}
        <div ref={worldRef} id="world" className="relative flex-1 w-full bg-gradient-to-b from-sky-100 to-sky-50 overflow-hidden z-10 touch-none">
          {/* Guidelines */}
          <div className="guidelines absolute inset-0 flex pointer-events-none opacity-10 w-full h-full">
            <div className="flex-1 border-r border-slate-400 border-dashed"></div>
            <div className="flex-1 border-r border-slate-400 border-dashed"></div>
            <div className="flex-1"></div>
          </div>
        </div>

        {/* Bins */}
        <div className="relative h-[25%] w-full flex z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]">
          {/* Plastic */}
          <div id="bin-plastic" className="flex-1 bg-yellow-400 border-t-8 border-yellow-600 flex flex-col items-center justify-center p-2 transition-transform duration-100">
            <div className="opacity-50 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-900 sm:w-12 sm:h-12"><path d="M7 19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v10Z"/><path d="M12 3v6"/></svg>
            </div>
            <span className="font-black text-yellow-900 tracking-wider text-sm sm:text-xl">PLASTİK</span>
          </div>
          {/* Glass */}
          <div id="bin-glass" className="flex-1 bg-green-500 border-t-8 border-green-700 flex flex-col items-center justify-center p-2 transition-transform duration-100">
            <div className="opacity-50 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-900 sm:w-12 sm:h-12"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>
            </div>
            <span className="font-black text-green-900 tracking-wider text-sm sm:text-xl">CAM</span>
          </div>
          {/* Metal */}
          <div id="bin-metal" className="flex-1 bg-slate-400 border-t-8 border-slate-600 flex flex-col items-center justify-center p-2 transition-transform duration-100">
            <div className="opacity-50 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 sm:w-12 sm:h-12"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.9.9"/><path d="m10 9 5 5"/></svg>
            </div>
            <span className="font-black text-slate-900 tracking-wider text-sm sm:text-xl">METAL</span>
          </div>
        </div>
      </div>

      {/* Start Screen */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">Geri Dönüşüm<br/>Avcısı</h1>
            <p className="text-slate-500 mb-8">Doğru atıkları doğru kutulara at, puanları topla!</p>
            <button onClick={startGame} className="w-full bg-green-600 hover:bg-green-700 active:scale-95 transition-all text-white font-bold py-4 rounded-xl text-xl shadow-lg flex items-center justify-center gap-2">
              BAŞLA
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Süre Doldu!</h2>
            <div className="my-6">
              <p className="text-slate-500 uppercase text-sm font-bold tracking-wider">SKORUN</p>
              <div className="text-6xl font-black text-green-600">{score}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
               <div className="bg-slate-100 p-3 rounded-lg">
                 <div className="font-bold text-green-600 text-lg">+10</div>
                 <div className="text-slate-400">Doğru</div>
               </div>
               <div className="bg-slate-100 p-3 rounded-lg">
                 <div className="font-bold text-red-500 text-lg">-5</div>
                 <div className="text-slate-400">Yanlış</div>
               </div>
            </div>
            <button onClick={startGame} className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold py-4 rounded-xl text-xl shadow-lg flex items-center justify-center gap-2">
              TEKRAR OYNA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}