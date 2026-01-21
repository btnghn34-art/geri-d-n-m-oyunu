// Geri Dönüşüm Avcısı - Vanilla JS Implementation

// --- Types & Constants ---
const TYPES = ['PLASTIC', 'GLASS', 'METAL'];
const GAME_DURATION = 60;
const BIN_HEIGHT_PERCENT = 25; // Hitbox for bins

// --- State ---
let gameState: 'MENU' | 'PLAYING' | 'GAMEOVER' = 'MENU';
let score = 0;
let time = GAME_DURATION;
let items: any[] = [];
let lastSpawn = 0;
let spawnRate = 1500;
let gameLoopId: number;
let timerIntervalId: number;

// --- Elements ---
const world = document.getElementById('world')!;
const scoreDisplay = document.getElementById('score-display')!;
const timerDisplay = document.getElementById('timer-display')!;
const startScreen = document.getElementById('start-screen')!;
const gameOverScreen = document.getElementById('game-over-screen')!;
const finalScoreDisplay = document.getElementById('final-score')!;
const startBtn = document.getElementById('start-btn')!;
const restartBtn = document.getElementById('restart-btn')!;

// --- Audio System ---
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playSound(type: 'correct' | 'wrong' | 'gameover') {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  
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
}

// --- Game Logic ---

function initGame() {
  score = 0;
  time = GAME_DURATION;
  items = [];
  lastSpawn = 0;
  spawnRate = 1500;
  
  // Update UI
  scoreDisplay.innerText = '0';
  timerDisplay.innerText = time.toString();
  timerDisplay.classList.remove('text-red-600');
  
  // Clear world
  world.innerHTML = `
    <div class="absolute inset-0 flex pointer-events-none opacity-10 w-full h-full">
        <div class="flex-1 border-r border-slate-400 border-dashed"></div>
        <div class="flex-1 border-r border-slate-400 border-dashed"></div>
        <div class="flex-1"></div>
    </div>
  `;
}

function startGame() {
  gameState = 'PLAYING';
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  initGame();
  
  // Resume audio context if needed
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Start Loops
  lastSpawn = performance.now();
  gameLoopId = requestAnimationFrame(gameLoop);
  
  timerIntervalId = window.setInterval(() => {
    time--;
    timerDisplay.innerText = time.toString();
    if (time <= 10) timerDisplay.classList.add('text-red-600');
    if (time <= 0) endGame();
  }, 1000);
}

function endGame() {
  gameState = 'GAMEOVER';
  cancelAnimationFrame(gameLoopId);
  clearInterval(timerIntervalId);
  
  playSound('gameover');
  finalScoreDisplay.innerText = score.toString();
  gameOverScreen.classList.remove('hidden');
}

function spawnItem() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const id = 'item-' + Date.now() + Math.random();
  const startX = 10 + Math.random() * 80; // 10% to 90%

  // Visuals
  const el = document.createElement('div');
  el.id = id;
  el.className = 'item w-14 h-14 rounded-full border-4 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-10';
  el.style.left = startX + '%';
  el.style.top = '-10%';

  // Type specific styling
  let iconSvg = '';
  if (type === 'PLASTIC') {
    el.classList.add('bg-yellow-300', 'border-yellow-500');
    iconSvg = '<svg class="w-8 h-8 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 19a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10zM12 3v6"></path></svg>';
  } else if (type === 'GLASS') {
    el.classList.add('bg-green-300', 'border-green-500');
    iconSvg = '<svg class="w-8 h-8 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>';
  } else {
    el.classList.add('bg-slate-300', 'border-slate-500');
    iconSvg = '<svg class="w-8 h-8 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
  }
  el.innerHTML = iconSvg;

  // Add Drag Event Listeners
  el.addEventListener('pointerdown', (e) => handleDragStart(e, itemData));

  world.appendChild(el);

  const itemData = {
    id,
    el,
    type,
    x: startX,
    y: -10,
    speed: 0.2 + (Math.random() * 0.1) + ((60 - time) * 0.005), // Speed increases over time
    isDragging: false
  };

  items.push(itemData);
}

// Drag Logic
let draggedItem: any = null;

function handleDragStart(e: PointerEvent, item: any) {
  if (gameState !== 'PLAYING') return;
  e.preventDefault();
  draggedItem = item;
  item.isDragging = true;
  item.el.setPointerCapture(e.pointerId);
  item.el.classList.add('scale-125', 'z-50');
}

window.addEventListener('pointermove', (e) => {
  if (!draggedItem) return;
  e.preventDefault();
  
  const rect = world.getBoundingClientRect();
  const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
  
  // Clamp to screen
  draggedItem.x = Math.max(5, Math.min(95, xPercent));
  draggedItem.el.style.left = draggedItem.x + '%';
});

window.addEventListener('pointerup', (e) => {
  if (!draggedItem) return;
  draggedItem.isDragging = false;
  draggedItem.el.classList.remove('scale-125', 'z-50');
  draggedItem = null;
});

window.addEventListener('pointercancel', (e) => {
  if (!draggedItem) return;
  draggedItem.isDragging = false;
  draggedItem.el.classList.remove('scale-125', 'z-50');
  draggedItem = null;
});


function gameLoop(timestamp: number) {
  if (gameState !== 'PLAYING') return;

  // Spawn
  const currentInterval = Math.max(500, 1500 - ((60 - time) * 20));
  if (timestamp - lastSpawn > currentInterval) {
    spawnItem();
    lastSpawn = timestamp;
  }

  // Update Items
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    
    // Fall logic
    if (!item.isDragging) {
       item.y += item.speed;
    } else {
       // Slow fall while dragging? Or no fall? Let's keep slow fall for pressure
       item.y += item.speed * 0.5;
    }
    
    item.el.style.top = item.y + '%';

    // Check bounds (bottom of world)
    // World is relative container.
    // Logic: If item.y > 100 - BIN_HEIGHT_PERCENT, we check collision
    
    // We visually start bins at bottom 25% (or 20%).
    // Let's say hitline is at 85% Y position
    if (item.y > 85) {
      // Determine Bin
      let targetBin = '';
      if (item.x < 33.3) targetBin = 'PLASTIC';
      else if (item.x < 66.6) targetBin = 'GLASS';
      else targetBin = 'METAL';

      // Check Match
      const isCorrect = targetBin === item.type;
      
      // Feedback
      if (isCorrect) {
        score += 10;
        playSound('correct');
        highlightBin(targetBin, 'correct');
      } else {
        score -= 5;
        playSound('wrong');
        highlightBin(targetBin, 'wrong');
      }
      
      scoreDisplay.innerText = score.toString();

      // Remove
      item.el.remove();
      items.splice(i, 1);
    }
  }

  gameLoopId = requestAnimationFrame(gameLoop);
}

function highlightBin(type: string, result: 'correct' | 'wrong') {
  const binId = type === 'PLASTIC' ? 'bin-plastic' : type === 'GLASS' ? 'bin-glass' : 'bin-metal';
  const el = document.getElementById(binId);
  if (el) {
    const colorClass = result === 'correct' ? 'brightness-125' : 'bg-red-500';
    el.classList.add(colorClass, 'scale-105');
    setTimeout(() => {
      el.classList.remove(colorClass, 'scale-105');
    }, 200);
  }
}

// Bind Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
