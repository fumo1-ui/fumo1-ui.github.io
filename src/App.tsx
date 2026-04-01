import { useState, useEffect, useRef, useCallback } from 'react';

// Telegram Gifts Catalog - основанный на реальных подарках Telegram
const TELEGRAM_GIFTS = [
  { id: 'homemade_cake', name: 'Домашний торт', emoji: '🎂', price: 50, rarity: 'common' },
  { id: 'jelly_bunny', name: 'Желейный кролик', emoji: '🐰', price: 75, rarity: 'common' },
  { id: 'santa_hat', name: 'Шапка Санты', emoji: '🎅', price: 100, rarity: 'uncommon' },
  { id: 'spiced_wine', name: 'Глинтвейн', emoji: '🍷', price: 120, rarity: 'uncommon' },
  { id: 'crystal_ball', name: 'Хрустальный шар', emoji: '🔮', price: 150, rarity: 'uncommon' },
  { id: 'star_gift', name: 'Звёздный подарок', emoji: '⭐', price: 200, rarity: 'rare' },
  { id: 'diamond_heart', name: 'Алмазное сердце', emoji: '💎', price: 300, rarity: 'rare' },
  { id: 'golden_crown', name: 'Золотая корона', emoji: '👑', price: 400, rarity: 'rare' },
  { id: 'magic_wand', name: 'Волшебная палочка', emoji: '✨', price: 500, rarity: 'epic' },
  { id: 'unicorn', name: 'Единорог', emoji: '🦄', price: 750, rarity: 'epic' },
  { id: 'dragon_egg', name: 'Яйцо дракона', emoji: '🥚', price: 1000, rarity: 'epic' },
  { id: 'phoenix', name: 'Феникс', emoji: '🔥', price: 1500, rarity: 'legendary' },
  { id: 'moon_crystal', name: 'Лунный кристалл', emoji: '🌙', price: 2000, rarity: 'legendary' },
  { id: 'cosmic_star', name: 'Космическая звезда', emoji: '🌟', price: 3000, rarity: 'legendary' },
  { id: 'rainbow_gem', name: 'Радужный камень', emoji: '🌈', price: 5000, rarity: 'mythic' },
  { id: 'infinity_stone', name: 'Камень бесконечности', emoji: '💠', price: 7500, rarity: 'mythic' },
  { id: 'durov_special', name: 'Особый от Дурова', emoji: '🚀', price: 10000, rarity: 'mythic' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E', 
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
  mythic: '#EF4444',
};

const RARITY_NAMES: Record<string, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  mythic: 'Мифический',
};

const MINE_OPEN_SEQUENCE = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 10, 12, 14, 16, 20, 25];

interface GiftItem {
  giftId: string;
  uniqueId: string;
}

interface Upgrades {
  tap: number;
  mine: number;
  pick: number;
}

type Mode = 'clicker' | 'rocket' | 'mines' | 'gifts' | 'upgrade';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ui_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  
  const [wallet, setWallet] = useState(() => parseFloat(localStorage.getItem('wallet_v3') || '0'));
  const [tapPoints, setTapPoints] = useState(() => parseFloat(localStorage.getItem('tap_points_v1') || '0'));
  const [inventory, setInventory] = useState<GiftItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gifts_inventory_v5') || '[]');
    } catch { return []; }
  });
  const [upgrades, setUpgrades] = useState<Upgrades>(() => {
    try {
      const o = JSON.parse(localStorage.getItem('upgrades_v1') || 'null');
      if (o) return { tap: o.tap || 0, mine: o.mine || 0, pick: o.pick || o.luck || 0 };
    } catch {}
    return { tap: 0, mine: 0, pick: 0 };
  });
  
  const [mode, setMode] = useState<Mode>('clicker');
  const [clickFlash, setClickFlash] = useState('');
  const [toast, setToast] = useState('');
  
  // Rocket state
  const [rocketStake, setRocketStake] = useState(10);
  const [rocketPhase, setRocketPhase] = useState<'idle' | 'flying' | 'crashed' | 'cashed'>('idle');
  const [rocketX, setRocketX] = useState(1);
  const [, setRocketCrashX] = useState(2);
  const [rocketMsg, setRocketMsg] = useState('');
  const rocketRef = useRef<{ t0: number; duration: number; raf: number }>({ t0: 0, duration: 0, raf: 0 });
  
  // Mines state
  const [minesRows, setMinesRows] = useState(4);
  const [minesCols, setMinesCols] = useState(4);
  const [minesCount, setMinesCount] = useState(3);
  const [minesStake, setMinesStake] = useState(10);
  const [mineCells, setMineCells] = useState<{ mine: boolean; mult: number; revealed: boolean }[]>([]);
  const [minePlaying, setMinePlaying] = useState(false);
  const [mineProduct, setMineProduct] = useState(1);
  const [mineStakeActive, setMineStakeActive] = useState(0);
  const [minesMsg, setMinesMsg] = useState('');
  const [mineSafeStep, setMineSafeStep] = useState(0);
  
  // Gift picker state
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [giftChoices, setGiftChoices] = useState<typeof TELEGRAM_GIFTS>([]);
  
  // Upgrade spinner state
  const [showUpgradeSpinner, setShowUpgradeSpinner] = useState(false);
  const [spinningGift, setSpinningGift] = useState<GiftItem | null>(null);
  const [spinResult, setSpinResult] = useState<'pending' | 'win' | 'lose'>('pending');
  const [spinChance, setSpinChance] = useState(25);
  const [spinAngle, setSpinAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Persist
  useEffect(() => { localStorage.setItem('wallet_v3', String(wallet)); }, [wallet]);
  useEffect(() => { localStorage.setItem('tap_points_v1', String(tapPoints)); }, [tapPoints]);
  useEffect(() => { localStorage.setItem('gifts_inventory_v5', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('upgrades_v1', JSON.stringify(upgrades)); }, [upgrades]);
  useEffect(() => { 
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ui_theme', theme);
  }, [theme]);
  
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };
  
  const getTapPerClick = () => 1 + upgrades.tap;
  const getMineBonusMult = () => 1 + upgrades.mine * 0.02;
  const getGiftChoiceCount = () => Math.min(TELEGRAM_GIFTS.length, 3 + upgrades.pick * 2);
  const upgradeCost = (level: number, base: number) => Math.max(1, Math.floor(base * Math.pow(1.5, level)));
  
  const handleTap = () => {
    const add = getTapPerClick();
    setTapPoints(t => t + add);
    setWallet(w => w + add);
    setClickFlash(`+${add} тап · +${add} монет`);
    setTimeout(() => setClickFlash(''), 300);
  };
  
  const handleReset = () => {
    if (confirm('Обнулить баланс, тапы, апгрейды и инвентарь подарков?')) {
      setWallet(0);
      setTapPoints(0);
      setUpgrades({ tap: 0, mine: 0, pick: 0 });
      setInventory([]);
    }
  };
  
  // Gift picker
  const openGiftPicker = () => {
    const count = getGiftChoiceCount();
    const shuffled = [...TELEGRAM_GIFTS].sort(() => Math.random() - 0.5);
    setGiftChoices(shuffled.slice(0, count));
    setShowGiftPicker(true);
  };
  
  const selectGift = (gift: typeof TELEGRAM_GIFTS[0]) => {
    const newItem: GiftItem = { giftId: gift.id, uniqueId: `${gift.id}_${Date.now()}_${Math.random()}` };
    setInventory(inv => [...inv, newItem]);
    showToast(`«${gift.name}» добавлен в инвентарь!`);
    setShowGiftPicker(false);
  };
  
  // Rocket game
  const startRocket = () => {
    if (wallet < rocketStake) {
      setRocketMsg('Недостаточно баланса.');
      return;
    }
    setWallet(w => w - rocketStake);
    const crashX = 1.35 + Math.random() * 16.65;
    const duration = 2500 + Math.random() * 4200;
    setRocketCrashX(crashX);
    setRocketX(1);
    setRocketPhase('flying');
    setRocketMsg('');
    rocketRef.current = { t0: performance.now(), duration, raf: 0 };
    
    const loop = (now: number) => {
      const elapsed = now - rocketRef.current.t0;
      const p = Math.min(1, elapsed / rocketRef.current.duration);
      const currentX = 1 + (crashX - 1) * p;
      setRocketX(currentX);
      
      if (p >= 1) {
        setRocketPhase('crashed');
        setRocketMsg(`Крушение на ×${crashX.toFixed(2)} — ставка сгорела.`);
        return;
      }
      rocketRef.current.raf = requestAnimationFrame(loop);
    };
    rocketRef.current.raf = requestAnimationFrame(loop);
  };
  
  const cashRocket = () => {
    if (rocketPhase !== 'flying') return;
    cancelAnimationFrame(rocketRef.current.raf);
    const gain = rocketStake * rocketX;
    setWallet(w => w + gain);
    setRocketPhase('cashed');
    setRocketMsg(`Забрали ${gain.toFixed(2)} (×${rocketX.toFixed(2)}).`);
    openGiftPicker();
  };
  
  // Mines game
  const buildMineBoard = useCallback(() => {
    const n = minesRows * minesCols;
    const idx = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    const mineSet = new Set(idx.slice(0, Math.min(minesCount, n - 1)));
    return Array.from({ length: n }, (_, i) => ({
      mine: mineSet.has(i),
      mult: 0,
      revealed: false,
    }));
  }, [minesRows, minesCols, minesCount]);
  
  const startMines = () => {
    if (minePlaying && !confirm('Прервать партию?')) return;
    if (wallet < minesStake) {
      setMinesMsg('Недостаточно баланса.');
      return;
    }
    setWallet(w => w - minesStake);
    setMineCells(buildMineBoard());
    setMineStakeActive(minesStake);
    setMineProduct(1);
    setMineSafeStep(0);
    setMinePlaying(true);
    setMinesMsg(`Ставка ${minesStake}. 1-я безопасная = ×${MINE_OPEN_SEQUENCE[0]}`);
  };
  
  const clickMineCell = (i: number) => {
    if (!minePlaying || mineCells[i].revealed) return;
    const newCells = [...mineCells];
    newCells[i] = { ...newCells[i], revealed: true };
    
    if (newCells[i].mine) {
      setMinePlaying(false);
      newCells.forEach((c, j) => { if (c.mine) newCells[j] = { ...c, revealed: true }; });
      setMineCells(newCells);
      setMinesMsg(`Мина — ставка ${mineStakeActive} сгорела.`);
    } else {
      const mult = MINE_OPEN_SEQUENCE[Math.min(mineSafeStep, MINE_OPEN_SEQUENCE.length - 1)];
      newCells[i].mult = mult;
      const newProduct = mineProduct * mult;
      setMineProduct(newProduct);
      setMineSafeStep(s => s + 1);
      setMineCells(newCells);
      setMinesMsg(`×${mult} → произвед. ${newProduct.toFixed(2)}`);
      
      const safeLeft = newCells.filter(c => !c.mine && !c.revealed).length;
      if (safeLeft === 0) {
        cashoutMines(newCells, newProduct, true);
      }
    }
  };
  
  const cashoutMines = (cells?: typeof mineCells, prod?: number, auto = false) => {
    const p = prod ?? mineProduct;
    if (!minePlaying || p <= 1) return;
    const gain = mineStakeActive * p * getMineBonusMult();
    setWallet(w => w + gain);
    setMinePlaying(false);
    const newCells = (cells ?? mineCells).map(c => ({ ...c, revealed: true }));
    setMineCells(newCells);
    setMinesMsg(`${auto ? 'Все клетки! ' : ''}Вывод: ${gain.toFixed(2)} (×${p.toFixed(2)}).`);
    openGiftPicker();
  };
  
  // Upgrade spinner
  const getNextGift = (currentGift: typeof TELEGRAM_GIFTS[0]) => {
    const currentIndex = TELEGRAM_GIFTS.findIndex(g => g.id === currentGift.id);
    if (currentIndex < TELEGRAM_GIFTS.length - 1) {
      return TELEGRAM_GIFTS[currentIndex + 1];
    }
    return null;
  };
  
  const startUpgradeSpinner = (item: GiftItem) => {
    const gift = TELEGRAM_GIFTS.find(g => g.id === item.giftId);
    if (!gift) return;
    const nextGift = getNextGift(gift);
    if (!nextGift) {
      showToast('Это уже максимальный подарок!');
      return;
    }
    setSpinningGift(item);
    setSpinResult('pending');
    setSpinAngle(0);
    setIsSpinning(false);
    
    // Chance based on price difference
    const priceDiff = nextGift.price / gift.price;
    const chance = Math.max(10, Math.min(50, Math.round(50 / priceDiff)));
    setSpinChance(chance);
    setShowUpgradeSpinner(true);
  };
  
  const doSpin = () => {
    if (isSpinning || !spinningGift) return;
    setIsSpinning(true);
    
    const win = Math.random() * 100 < spinChance;
    // Calculate final angle: win zone is 0-90deg (green), lose zone is 90-360deg (red)
    const winZone = (spinChance / 100) * 360;
    let finalAngle: number;
    if (win) {
      finalAngle = Math.random() * winZone;
    } else {
      finalAngle = winZone + Math.random() * (360 - winZone);
    }
    
    // Add multiple rotations
    const rotations = 5 + Math.floor(Math.random() * 3);
    const totalAngle = rotations * 360 + finalAngle;
    
    setSpinAngle(totalAngle);
    
    setTimeout(() => {
      setSpinResult(win ? 'win' : 'lose');
      setIsSpinning(false);
      
      if (win) {
        const gift = TELEGRAM_GIFTS.find(g => g.id === spinningGift.giftId);
        const nextGift = gift ? getNextGift(gift) : null;
        if (nextGift) {
          setInventory(inv => {
            const filtered = inv.filter(i => i.uniqueId !== spinningGift.uniqueId);
            return [...filtered, { giftId: nextGift.id, uniqueId: `${nextGift.id}_${Date.now()}_${Math.random()}` }];
          });
          showToast(`Успех! Получен «${nextGift.name}»!`);
        }
      } else {
        setInventory(inv => inv.filter(i => i.uniqueId !== spinningGift.uniqueId));
        showToast('Неудача! Подарок потерян.');
      }
    }, 4000);
  };
  
  const formatMoney = (x: number) => x >= 1e6 ? x.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : x.toFixed(2);
  
  const groupedInventory = inventory.reduce((acc, item) => {
    acc[item.giftId] = (acc[item.giftId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`app ${theme}`} data-theme={theme}>
      <style>{`
        :root {
          --md-primary: #6750A4;
          --md-on-primary: #FFFFFF;
          --md-primary-container: #EADDFF;
          --md-on-primary-container: #21005D;
          --md-secondary-container: #E8DEF8;
          --md-on-secondary-container: #1D192B;
          --md-surface: #FEF7FF;
          --md-surface-container-low: #F7F2FA;
          --md-surface-container: #F3EDF7;
          --md-surface-container-high: #ECE6F0;
          --md-surface-container-highest: #E6E0E9;
          --md-on-surface: #1D1B20;
          --md-on-surface-variant: #49454F;
          --md-outline: #79747E;
          --md-error: #B3261E;
          --md-error-container: #F9DEDC;
          --md-win: #1B7A3A;
          --shape-xl: 28px;
          --shape-lg: 20px;
          --shape-md: 16px;
          --shape-sm: 12px;
          --elev-1: 0 1px 2px rgba(0,0,0,.08), 0 1px 3px 1px rgba(0,0,0,.06);
          --elev-2: 0 1px 3px rgba(0,0,0,.12), 0 4px 8px 2px rgba(0,0,0,.08);
          --bottom-nav-h: 64px;
        }
        [data-theme="dark"] {
          --md-primary: #CFBCFF;
          --md-on-primary: #2E1F5E;
          --md-primary-container: #4F3C7A;
          --md-on-primary-container: #E8DDFF;
          --md-secondary-container: #444056;
          --md-on-secondary-container: #E8DEF8;
          --md-surface: #100F14;
          --md-surface-container-low: #1A1820;
          --md-surface-container: #211F27;
          --md-surface-container-high: #2C2A32;
          --md-surface-container-highest: #36343D;
          --md-on-surface: #E6E1E6;
          --md-on-surface-variant: #CAC4CF;
          --md-outline: #948F9A;
          --md-error: #FFB4AB;
          --md-error-container: #93000A;
          --md-win: #81C784;
          --elev-1: 0 1px 2px rgba(0,0,0,.35), 0 1px 4px rgba(0,0,0,.25);
          --elev-2: 0 2px 8px rgba(0,0,0,.4);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: "Roboto", system-ui, sans-serif;
          background: linear-gradient(165deg, var(--md-surface) 0%, var(--md-primary-container) 38%, var(--md-secondary-container) 100%);
          color: var(--md-on-surface);
          min-height: 100vh;
          min-height: 100dvh;
        }
        .app {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 1rem calc(var(--bottom-nav-h) + 1rem);
          user-select: none;
        }
        h1 { font-weight: 500; font-size: 1.25rem; margin-bottom: 0.65rem; }
        .wallet-bar {
          width: 100%; max-width: 520px;
          background: var(--md-surface-container-high);
          border-radius: var(--shape-xl);
          padding: 0.85rem 1rem;
          margin-bottom: 0.75rem;
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: space-between;
          gap: 0.5rem;
          box-shadow: var(--elev-1);
        }
        .wallet-bar strong { color: var(--md-primary); font-size: 1.25rem; font-weight: 700; }
        .wallet-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .btn-outlined {
          background: transparent;
          color: var(--md-primary);
          border: 1px solid var(--md-outline);
          padding: 0.45rem 0.6rem;
          border-radius: var(--shape-md);
          font: inherit;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .btn-filled {
          background: var(--md-primary);
          color: var(--md-on-primary);
          border: none;
          padding: 0.65rem 1.2rem;
          border-radius: var(--shape-md);
          font: inherit;
          font-weight: 500;
          cursor: pointer;
          box-shadow: var(--elev-1);
        }
        .btn-filled:disabled { opacity: 0.38; cursor: not-allowed; }
        .btn-tonal { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
        .btn-danger { background: var(--md-error); color: #fff; }
        .mode { width: 100%; max-width: 520px; display: none; flex-direction: column; align-items: center; }
        .mode.active { display: flex; }
        .hint { margin: 0 0 0.85rem; color: var(--md-on-surface-variant); font-size: 0.84rem; text-align: center; max-width: 28rem; line-height: 1.5; }
        .stage-wrap {
          background: var(--md-surface-container-low);
          border-radius: var(--shape-xl);
          padding: 1rem;
          box-shadow: var(--elev-2);
          width: 100%; max-width: 480px;
          border: 1px solid color-mix(in srgb, var(--md-outline) 18%, transparent);
          margin-bottom: 0.5rem;
        }
        .row-inputs {
          display: flex; flex-wrap: wrap; gap: 0.65rem;
          align-items: flex-end; justify-content: center;
          margin-bottom: 0.65rem;
        }
        .row-inputs label {
          display: flex; flex-direction: column; gap: 0.2rem;
          font-size: 0.72rem; font-weight: 500; color: var(--md-on-surface-variant);
        }
        .row-inputs input, .row-inputs select {
          background: var(--md-surface);
          border: 1px solid color-mix(in srgb, var(--md-outline) 40%, transparent);
          color: var(--md-on-surface);
          border-radius: var(--shape-sm);
          padding: 0.45rem 0.55rem;
          font: inherit; min-width: 4rem;
        }
        #click-btn {
          width: 100px; height: 100px;
          border-radius: 50%; border: none;
          background: linear-gradient(145deg, var(--md-primary) 0%, #7F67BE 55%, #4F378B 100%);
          color: var(--md-on-primary);
          font-size: 0.88rem; font-weight: 700;
          cursor: pointer;
          box-shadow: var(--elev-2), 0 0 0 3px var(--md-primary-container);
        }
        #click-btn:active { transform: scale(0.94); }
        .click-flash { margin-top: 0.5rem; min-height: 1.1rem; color: var(--md-primary); font-weight: 700; font-size: 0.9rem; }
        .rocket-card {
          width: 100%; max-width: 440px;
          background: var(--md-surface-container-low);
          border-radius: var(--shape-xl);
          padding: 0.85rem;
          box-shadow: var(--elev-2);
          display: flex; flex-direction: column; gap: 0.55rem;
        }
        .rocket-hero {
          text-align: center; padding: 0.5rem;
          background: linear-gradient(180deg, var(--md-primary-container) 0%, transparent 100%);
          border-radius: var(--shape-lg);
        }
        .plane-visual {
          font-size: 4rem;
          transition: transform 0.3s;
        }
        .plane-visual.crashed { transform: rotate(45deg) scale(0.8); opacity: 0.5; }
        .plane-visual.flying { animation: fly 0.5s ease-in-out infinite alternate; }
        @keyframes fly { to { transform: translateY(-10px) rotate(-10deg); } }
        .rocket-x-display { font-size: 1.65rem; font-weight: 700; color: var(--md-primary); }
        .rocket-msg { text-align: center; min-height: 1.35rem; font-weight: 500; font-size: 0.85rem; }
        .rocket-msg.lose { color: var(--md-error); }
        .rocket-msg.win { color: var(--md-win); }
        .mines-grid-wrap { perspective: 900px; width: 100%; max-width: 240px; margin: 0 auto; }
        .mines-grid { display: grid; gap: 4px; width: 100%; }
        .mines-grid .cell {
          aspect-ratio: 1;
          border-radius: var(--shape-sm);
          border: none;
          background: var(--md-surface-container-highest);
          color: var(--md-on-surface);
          font-weight: 700;
          font-size: 0.68rem;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: var(--elev-1);
        }
        .mines-grid .cell.hidden::after {
          content: ""; width: 38%; height: 38%;
          border-radius: 5px;
          background: color-mix(in srgb, var(--md-primary) 28%, var(--md-surface));
        }
        .mines-grid .cell.safe { background: color-mix(in srgb, var(--md-primary-container) 65%, var(--md-surface)); color: var(--md-primary); }
        .mines-grid .cell.mine { background: var(--md-error-container); color: var(--md-error); }
        .mines-grid .cell:disabled { cursor: default; }
        .mines-msg { margin-top: 0.5rem; text-align: center; min-height: 1.35rem; font-weight: 500; }
        .mines-msg.lose { color: var(--md-error); }
        .mines-msg.win { color: var(--md-win); }
        .gift-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.55rem; width: 100%;
        }
        .gift-card {
          background: var(--md-surface-container-high);
          border-radius: var(--shape-lg);
          padding: 0.5rem 0.35rem;
          text-align: center;
          box-shadow: var(--elev-1);
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
          border: 2px solid transparent;
        }
        .gift-card:hover { transform: scale(1.02); }
        .gift-card.has { border-color: var(--md-primary); }
        .gift-emoji { font-size: 2.5rem; margin-bottom: 0.25rem; }
        .gift-name { font-size: 0.65rem; font-weight: 600; line-height: 1.15; }
        .gift-price { font-size: 0.58rem; color: var(--md-on-surface-variant); margin-top: 0.15rem; }
        .gift-count { font-size: 0.62rem; margin-top: 0.15rem; }
        .gift-count strong { color: var(--md-primary); }
        .upgrade-card {
          margin-bottom: 0.65rem;
          padding: 0.75rem;
          border-radius: var(--shape-md);
          background: var(--md-surface-container-high);
          border: 1px solid color-mix(in srgb, var(--md-outline) 18%, transparent);
        }
        .upgrade-card h3 { margin: 0 0 0.35rem; font-size: 0.88rem; font-weight: 600; }
        .upgrade-card p { margin: 0 0 0.5rem; font-size: 0.72rem; color: var(--md-on-surface-variant); }
        .upgrade-card .row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; justify-content: space-between; }
        .upgrade-lvl { font-size: 0.72rem; color: var(--md-primary); font-weight: 700; }
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0;
          height: var(--bottom-nav-h);
          background: var(--md-surface-container-highest);
          border-top: 1px solid color-mix(in srgb, var(--md-outline) 22%, transparent);
          display: flex; justify-content: space-around; align-items: center;
          padding: 0 0.25rem;
          padding-bottom: env(safe-area-inset-bottom, 0);
          z-index: 100;
        }
        .bottom-nav button {
          flex: 1; max-width: 120px;
          border: none; background: transparent;
          color: var(--md-on-surface-variant);
          font: inherit; font-size: 0.58rem; font-weight: 600;
          padding: 0.35rem 0.1rem;
          border-radius: var(--shape-md);
          cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
        }
        .bottom-nav button .nav-ico { font-size: 1.15rem; }
        .bottom-nav button.active {
          color: var(--md-primary);
          background: color-mix(in srgb, var(--md-primary) 12%, transparent);
        }
        .toast {
          position: fixed;
          bottom: calc(var(--bottom-nav-h) + 12px);
          left: 50%; transform: translateX(-50%) translateY(120%);
          background: var(--md-primary-container);
          color: var(--md-on-primary-container);
          padding: 0.65rem 1rem;
          border-radius: var(--shape-lg);
          font-size: 0.85rem; font-weight: 500;
          box-shadow: var(--elev-2);
          z-index: 200;
          opacity: 0;
          transition: transform 0.35s, opacity 0.35s;
        }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        .overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.48);
          z-index: 300;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .overlay.hidden { display: none; }
        .panel {
          background: var(--md-surface-container-high);
          border-radius: var(--shape-xl);
          padding: 1rem;
          max-width: 420px; width: 100%;
          max-height: 82vh;
          overflow-y: auto;
          box-shadow: var(--elev-2);
        }
        .panel h2 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600; }
        .panel > p { margin: 0 0 0.75rem; font-size: 0.8rem; color: var(--md-on-surface-variant); }
        .gift-pick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
          gap: 0.45rem;
        }
        .gift-pick-item {
          border: 1px solid color-mix(in srgb, var(--md-outline) 30%, transparent);
          border-radius: var(--shape-md);
          padding: 0.35rem;
          background: var(--md-surface);
          cursor: pointer;
          text-align: center;
          font: inherit; color: inherit;
          transition: transform 0.1s, border-color 0.15s;
        }
        .gift-pick-item:hover { border-color: var(--md-primary); transform: scale(1.02); }
        .gift-pick-item .emoji { font-size: 2rem; margin-bottom: 0.2rem; }
        .gift-pick-item span { font-size: 0.62rem; font-weight: 600; display: block; }
        .gift-pick-skip { margin-top: 0.75rem; width: 100%; }
        
        /* Spinner styles */
        .spinner-container {
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }
        .spinner-wheel {
          width: 200px; height: 200px;
          border-radius: 50%;
          position: relative;
          transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        .spinner-wheel::before {
          content: "▼";
          position: absolute;
          top: -24px; left: 50%;
          transform: translateX(-50%);
          font-size: 1.5rem;
          color: var(--md-primary);
          z-index: 10;
        }
        .spinner-inner {
          width: 100%; height: 100%;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          box-shadow: var(--elev-2);
        }
        .spinner-segment {
          position: absolute;
          width: 100%; height: 100%;
          clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%);
        }
        .spinner-win { background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); }
        .spinner-lose { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); }
        .spinner-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 60px; height: 60px;
          border-radius: 50%;
          background: var(--md-surface);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
          box-shadow: var(--elev-1);
        }
        .spinner-info {
          text-align: center;
          padding: 0.5rem;
          background: var(--md-surface-container);
          border-radius: var(--shape-md);
        }
        .spinner-chance { font-size: 1.2rem; font-weight: 700; }
        .spinner-chance.win { color: #22C55E; }
        .spinner-result {
          padding: 1rem;
          border-radius: var(--shape-md);
          text-align: center;
          font-weight: 600;
        }
        .spinner-result.win { background: rgba(34, 197, 94, 0.2); color: #22C55E; }
        .spinner-result.lose { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
        .rarity-badge {
          display: inline-block;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.55rem;
          font-weight: 600;
          color: white;
          margin-top: 0.2rem;
        }
        .empty-inventory {
          text-align: center;
          padding: 2rem;
          color: var(--md-on-surface-variant);
        }
        .empty-inventory .emoji { font-size: 3rem; margin-bottom: 0.5rem; }
      `}</style>
      
      <h1>Тапы · Ракета · Мины · NFT</h1>
      
      <div className="wallet-bar">
        <div>
          <div style={{ fontWeight: 500 }}>
            Баланс: <strong>{formatMoney(wallet)}</strong>
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--md-on-surface-variant)' }}>
            Тапы: <strong style={{ color: 'var(--md-primary)' }}>{Math.floor(tapPoints)}</strong>
          </div>
        </div>
        <div className="wallet-actions">
          <button className="btn-outlined" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
          </button>
          <button className="btn-outlined" onClick={handleReset}>Сброс</button>
        </div>
      </div>
      
      {/* Clicker Mode */}
      <div className={`mode ${mode === 'clicker' ? 'active' : ''}`}>
        <p className="hint">За тап — <strong>тапы</strong> и <strong>монеты</strong>. Подарок только после выигрыша в ракете/минах.</p>
        <div className="stage-wrap" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '0.4rem', color: 'var(--md-on-surface-variant)', fontSize: '0.8rem' }}>
            + тапов и монет: <strong>{getTapPerClick()}</strong>
          </div>
          <button id="click-btn" onClick={handleTap}>ТАП</button>
          <div className="click-flash">{clickFlash}</div>
        </div>
      </div>
      
      {/* Rocket Mode */}
      <div className={`mode ${mode === 'rocket' ? 'active' : ''}`}>
        <p className="hint">Краш случайный (×1.35…18). Выигрыш идёт на баланс + подарок.</p>
        <div className="rocket-card">
          <div className="row-inputs">
            <label>
              Ставка
              <input type="number" min="1" value={rocketStake} onChange={e => setRocketStake(Math.max(1, parseInt(e.target.value) || 0))} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button className="btn-filled" onClick={startRocket} disabled={rocketPhase === 'flying'}>Запуск</button>
            <button className="btn-filled btn-danger" onClick={cashRocket} disabled={rocketPhase !== 'flying'}>Забрать</button>
          </div>
          <div className="rocket-hero">
            <div className={`plane-visual ${rocketPhase === 'flying' ? 'flying' : ''} ${rocketPhase === 'crashed' ? 'crashed' : ''}`}>✈️</div>
            <div className="rocket-x-display">{rocketX.toFixed(2)}×</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--md-on-surface-variant)' }}>
              Ставка: {rocketStake}
            </div>
          </div>
          <div className={`rocket-msg ${rocketMsg.includes('сгорел') ? 'lose' : rocketMsg.includes('Забрали') ? 'win' : ''}`}>
            {rocketMsg}
          </div>
        </div>
      </div>
      
      {/* Mines Mode */}
      <div className={`mode ${mode === 'mines' ? 'active' : ''}`}>
        <p className="hint">Сетка 3–5. Множители: 1.5× → 2× → 2.5× … Мина сжигает ставку.</p>
        <div className="row-inputs">
          <label>
            Строки
            <select value={minesRows} onChange={e => setMinesRows(parseInt(e.target.value))}>
              {[3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>
            Столбцы
            <select value={minesCols} onChange={e => setMinesCols(parseInt(e.target.value))}>
              {[3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>
            Мин
            <select value={minesCount} onChange={e => setMinesCount(parseInt(e.target.value))}>
              {[1,2,3,4,5,6].filter(n => n < minesRows * minesCols).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>
            Ставка
            <input type="number" min="1" value={minesStake} onChange={e => setMinesStake(Math.max(1, parseInt(e.target.value) || 0))} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <button className="btn-filled" onClick={startMines}>Играть</button>
          <button className="btn-filled btn-tonal" onClick={() => cashoutMines()} disabled={!minePlaying || mineProduct <= 1}>Забрать</button>
        </div>
        <div className="stage-wrap">
          <div className="mines-grid-wrap">
            <div className="mines-grid" style={{ gridTemplateColumns: `repeat(${minesCols}, 1fr)` }}>
              {mineCells.map((cell, i) => (
                <button
                  key={i}
                  className={`cell ${!cell.revealed && minePlaying ? 'hidden' : ''} ${cell.revealed && cell.mine ? 'mine' : ''} ${cell.revealed && !cell.mine ? 'safe' : ''}`}
                  onClick={() => clickMineCell(i)}
                  disabled={!minePlaying || cell.revealed}
                >
                  {cell.revealed && (cell.mine ? '💣' : `×${cell.mult}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={`mines-msg ${minesMsg.includes('сгорел') ? 'lose' : minesMsg.includes('Вывод') ? 'win' : ''}`}>
          {minesMsg}
        </div>
      </div>
      
      {/* Gifts Mode */}
      <div className={`mode ${mode === 'gifts' ? 'active' : ''}`}>
        <p className="hint">Ваши подарки из Telegram. Нажмите на подарок для апгрейда (50/50 рулетка).</p>
        <div className="stage-wrap">
          {inventory.length === 0 ? (
            <div className="empty-inventory">
              <div className="emoji">📦</div>
              <div>Инвентарь пуст</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Выиграйте в ракете или минах, чтобы получить подарок
              </div>
            </div>
          ) : (
            <div className="gift-grid">
              {Object.entries(groupedInventory).map(([giftId, count]) => {
                const gift = TELEGRAM_GIFTS.find(g => g.id === giftId);
                if (!gift) return null;
                const item = inventory.find(i => i.giftId === giftId);
                return (
                  <div
                    key={giftId}
                    className="gift-card has"
                    onClick={() => item && startUpgradeSpinner(item)}
                  >
                    <div className="gift-emoji">{gift.emoji}</div>
                    <div className="gift-name">{gift.name}</div>
                    <div className="rarity-badge" style={{ background: RARITY_COLORS[gift.rarity] }}>
                      {RARITY_NAMES[gift.rarity]}
                    </div>
                    <div className="gift-price">⭐ {gift.price}</div>
                    <div className="gift-count">× <strong>{count}</strong></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Upgrade Mode */}
      <div className={`mode ${mode === 'upgrade' ? 'active' : ''}`}>
        <p className="hint">Тратьте <strong>тапы</strong> на улучшения.</p>
        <div className="stage-wrap">
          {[
            { key: 'tap' as const, title: 'Сила тапа', desc: '+1 тап и +1 монета за нажатие за уровень.', base: 35 },
            { key: 'mine' as const, title: 'Прибыль мин', desc: '+2% к выводу с мины за уровень.', base: 55 },
            { key: 'pick' as const, title: 'Варианты подарка', desc: '+2 карточки на выбор после выигрыша.', base: 70 },
          ].map(def => {
            const lvl = upgrades[def.key];
            const cost = upgradeCost(lvl, def.base);
            return (
              <div key={def.key} className="upgrade-card">
                <h3>{def.title}</h3>
                <p>{def.desc}</p>
                <div className="row">
                  <span className="upgrade-lvl">Ур. {lvl}</span>
                  <button
                    className="btn-filled"
                    disabled={tapPoints < cost}
                    onClick={() => {
                      if (tapPoints < cost) return;
                      setTapPoints(t => t - cost);
                      setUpgrades(u => ({ ...u, [def.key]: u[def.key] + 1 }));
                      showToast(`${def.title} → ур. ${lvl + 1}`);
                    }}
                  >
                    Купить за {cost} тап
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Toast */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
      
      {/* Gift Picker Overlay */}
      <div className={`overlay ${showGiftPicker ? '' : 'hidden'}`}>
        <div className="panel">
          <h2>🎁 Выберите подарок</h2>
          <p>Награда за выигрыш! Апгрейд «Варианты подарка» увеличивает число карт.</p>
          <div className="gift-pick-grid">
            {giftChoices.map(gift => (
              <button key={gift.id} className="gift-pick-item" onClick={() => selectGift(gift)}>
                <div className="emoji">{gift.emoji}</div>
                <span>{gift.name}</span>
                <div className="rarity-badge" style={{ background: RARITY_COLORS[gift.rarity] }}>
                  {RARITY_NAMES[gift.rarity]}
                </div>
              </button>
            ))}
          </div>
          <button className="btn-outlined gift-pick-skip" onClick={() => setShowGiftPicker(false)}>
            Пропустить подарок
          </button>
        </div>
      </div>
      
      {/* Upgrade Spinner Overlay */}
      <div className={`overlay ${showUpgradeSpinner ? '' : 'hidden'}`}>
        <div className="panel">
          <h2>🎰 Апгрейд подарка</h2>
          {spinningGift && (() => {
            const gift = TELEGRAM_GIFTS.find(g => g.id === spinningGift.giftId);
            const nextGift = gift ? getNextGift(gift) : null;
            if (!gift || !nextGift) return null;
            
            const winAngle = (spinChance / 100) * 360;
            
            return (
              <div className="spinner-container">
                <div className="spinner-info">
                  <div>{gift.emoji} {gift.name} → {nextGift.emoji} {nextGift.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-on-surface-variant)' }}>
                    ⭐ {gift.price} → ⭐ {nextGift.price}
                  </div>
                </div>
                
                <div className="spinner-wheel" style={{ transform: `rotate(${spinAngle}deg)` }}>
                  <div className="spinner-inner">
                    {/* Win segment (green) */}
                    <div 
                      className="spinner-segment spinner-win"
                      style={{
                        clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(winAngle * Math.PI / 180)}% ${50 - 50 * Math.cos(winAngle * Math.PI / 180)}%, 50% 50%)`,
                        background: `conic-gradient(from 0deg, #22C55E 0deg, #16A34A ${winAngle}deg, transparent ${winAngle}deg)`
                      }}
                    />
                    {/* Lose segment (red) */}
                    <div 
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        background: `conic-gradient(from 0deg, #22C55E 0deg ${winAngle}deg, #EF4444 ${winAngle}deg 360deg)`,
                        borderRadius: '50%'
                      }}
                    />
                    <div className="spinner-center">{gift.emoji}</div>
                  </div>
                </div>
                
                <div className={`spinner-chance ${spinResult === 'win' ? 'win' : ''}`}>
                  Шанс: {spinChance}%
                </div>
                
                {spinResult !== 'pending' && (
                  <div className={`spinner-result ${spinResult}`}>
                    {spinResult === 'win' 
                      ? `🎉 Успех! Получен «${nextGift.name}»!`
                      : `💔 Неудача! «${gift.name}» потерян.`
                    }
                  </div>
                )}
                
                {spinResult === 'pending' ? (
                  <button className="btn-filled" onClick={doSpin} disabled={isSpinning}>
                    {isSpinning ? 'Крутится...' : '🎰 Крутить!'}
                  </button>
                ) : (
                  <button className="btn-filled" onClick={() => setShowUpgradeSpinner(false)}>
                    Закрыть
                  </button>
                )}
                
                <button 
                  className="btn-outlined" 
                  onClick={() => setShowUpgradeSpinner(false)}
                  style={{ marginTop: '0.5rem' }}
                  disabled={isSpinning}
                >
                  Отмена
                </button>
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { mode: 'clicker' as const, icon: '👆', label: 'Тапы' },
          { mode: 'rocket' as const, icon: '✈️', label: 'Ракета' },
          { mode: 'mines' as const, icon: '💎', label: 'Мины' },
          { mode: 'gifts' as const, icon: '🎁', label: 'Подарки' },
          { mode: 'upgrade' as const, icon: '⬆️', label: 'Апгрейд' },
        ].map(item => (
          <button
            key={item.mode}
            className={mode === item.mode ? 'active' : ''}
            onClick={() => setMode(item.mode)}
          >
            <span className="nav-ico">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
