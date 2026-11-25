import { BigNum } from './economy/bigNumber.js';
import { GameStore } from './store.js';
import { ScratchCanvas } from './scratch/scratchCanvas.js';
import { ParticleSystem } from './scratch/particles.js';
import { HELPER_DEFINITIONS, UPGRADE_DEFINITIONS, getHelperCost, calculateTotalPassiveIncome } from './economy/upgrades.js';
import { PRESTIGE_UPGRADES, calculatePrestigeGain } from './economy/prestige.js';
import { calculateOfflineEarnings } from './economy/offline.js';
import { GameStorage } from './storage/save.js';

// Lista de símbolos de minijuego para la cuadrícula oculta
const SYMBOLS = [
  { icon: '🪙', name: 'Moneda de Oro', mult: 1.0 },
  { icon: '🍀', name: 'Trébol de Cuatro Hojas', mult: 2.0 },
  { icon: '💎', name: 'Diamante Radiante', mult: 3.5 },
  { icon: '👑', name: 'Corona Imperial', mult: 6.0 },
  { icon: '⭐', name: 'Estrella Fugaz', mult: 1.5 },
  { icon: '💀', name: 'Cráneo Maldito', mult: -0.3 },
  { icon: '🏺', name: 'Cofre del Tesoro', mult: 4.0 }
];

class GameApp {
  constructor() {
    this.cardsData = [];
    this.store = null;
    this.scratchCanvas = null;
    this.particleSystem = null;
    this.currentCardInstance = null;
    this.currentTab = 'helpers'; // 'helpers' o 'upgrades'
    this.lastLoopTime = performance.now();
    this.autoScratchAccumulator = 0;
  }

  async init() {
    // 1. Cargar datos de tarjetas
    try {
      const resp = await fetch('src/data/cards.json');
      this.cardsData = await resp.json();
    } catch (e) {
      console.warn('Fallback al cargar cards.json directamente:', e);
    }

    // 2. Inicializar Store con datos y estado guardado
    this.store = new GameStore(this.cardsData);
    const saved = GameStorage.load();
    this.store.init(saved);

    // 3. Inicializar Sistemas de Canvas
    const sCanvas = document.getElementById('scratch-canvas');
    const pCanvas = document.getElementById('particles-canvas');
    
    this.particleSystem = new ParticleSystem(pCanvas);
    this.scratchCanvas = new ScratchCanvas(sCanvas, {
      radius: 26,
      onProgress: (percent) => this.handleScratchProgress(percent),
      onRevealed: () => this.handleCardRevealed()
    });

    // 4. Inicializar interfaz y enlaces de eventos
    this.bindDOM();
    this.renderCardSelectors();
    this.setupNewCard();

    // 5. Suscribir render a cambios del Store
    this.store.subscribe((state) => this.renderHUD(state));
    this.renderHUD(this.store.getState());

    // 6. Comprobar ganancias Offline
    if (saved && saved.savedAt) {
      const offline = calculateOfflineEarnings(
        saved.savedAt,
        saved.helpers,
        saved.upgrades,
        this.store.prestigeMultiplier
      );

      if (offline.coinsEarned.gt(0)) {
        this.showOfflineModal(offline);
      }
    }

    // 7. Iniciar Game Loop a 60fps y Autoguardado cada 30 segundos
    requestAnimationFrame((t) => this.gameLoop(t));

    setInterval(() => {
      GameStorage.save(this.store.getState());
    }, 30000);

    // 8. Registrar Service Worker PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.log('SW registration note:', err);
        });
      });
    }
  }

  bindDOM() {
    // Pestañas de la tienda
    const tabHelpers = document.getElementById('tab-helpers-btn');
    const tabUpgrades = document.getElementById('tab-upgrades-btn');

    tabHelpers.addEventListener('click', () => {
      this.currentTab = 'helpers';
      tabHelpers.classList.add('active');
      tabUpgrades.classList.remove('active');
      this.renderShop();
    });

    tabUpgrades.addEventListener('click', () => {
      this.currentTab = 'upgrades';
      tabUpgrades.classList.add('active');
      tabHelpers.classList.remove('active');
      this.renderShop();
    });

    // Botón Siguiente Tarjeta
    document.getElementById('btn-next-card').addEventListener('click', () => {
      this.setupNewCard();
    });

    // Modales: Transmutación / Prestigio
    const prestigeModal = document.getElementById('prestige-modal');
    document.getElementById('btn-open-prestige').addEventListener('click', () => {
      this.renderPrestigeModal();
      prestigeModal.classList.add('active');
    });
    document.getElementById('close-prestige-modal').addEventListener('click', () => {
      prestigeModal.classList.remove('active');
    });
    document.getElementById('btn-execute-prestige').addEventListener('click', () => {
      const shards = calculatePrestigeGain(this.store.getState().lifetimeCoins);
      if (shards > 0) {
        this.store.triggerPrestige(shards);
        prestigeModal.classList.remove('active');
        this.particleSystem.explode(260, 190, 60, 'clover');
        this.setupNewCard();
      } else {
        alert('Necesitas acumular al menos 10 millones de monedas para desbloquear Fragmentos de Prisma.');
      }
    });

    // Modales: Stats
    const statsModal = document.getElementById('stats-modal');
    document.getElementById('btn-open-stats').addEventListener('click', () => {
      this.renderStatsModal();
      statsModal.classList.add('active');
    });
    document.getElementById('close-stats-modal').addEventListener('click', () => {
      statsModal.classList.remove('active');
    });

    // Modales: Opciones / Guardado
    const settingsModal = document.getElementById('settings-modal');
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      settingsModal.classList.add('active');
    });
    document.getElementById('close-settings-modal').addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });

    // Exportar / Importar
    document.getElementById('btn-export-save').addEventListener('click', () => {
      const code = GameStorage.exportSave(this.store.getState());
      document.getElementById('save-transfer-text').value = code;
      navigator.clipboard?.writeText(code);
      alert('¡Código de guardado copiado al portapapeles!');
    });

    document.getElementById('btn-import-save').addEventListener('click', () => {
      const text = document.getElementById('save-transfer-text').value;
      if (!text) return alert('Por favor pega el código primero.');
      const imported = GameStorage.importSave(text);
      if (imported) {
        this.store.init(imported);
        GameStorage.save(this.store.getState());
        settingsModal.classList.remove('active');
        alert('¡Partida cargada exitosamente!');
        this.setupNewCard();
      } else {
        alert('Código de guardado no válido.');
      }
    });

    document.getElementById('btn-hard-reset').addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas reiniciar TODO tu progreso? Esta acción no se puede deshacer.')) {
        this.store.resetHard();
        settingsModal.classList.remove('active');
        this.setupNewCard();
      }
    });

    // Modal Offline
    const offlineModal = document.getElementById('offline-modal');
    document.getElementById('close-offline-modal').addEventListener('click', () => {
      offlineModal.classList.remove('active');
    });
    document.getElementById('btn-collect-offline').addEventListener('click', () => {
      offlineModal.classList.remove('active');
    });
  }

  showOfflineModal(offlineData) {
    const modal = document.getElementById('offline-modal');
    const mins = Math.floor(offlineData.elapsedSeconds / 60);
    document.getElementById('offline-time-display').textContent = `${mins} minutos (${offlineData.elapsedSeconds}s)`;
    document.getElementById('offline-coins-display').textContent = `+${offlineData.coinsEarned.format()} 🪙`;
    
    this.store.addCoins(offlineData.coinsEarned);
    modal.classList.add('active');
  }

  renderCardSelectors() {
    const container = document.getElementById('cards-selector-container');
    container.innerHTML = '';

    const currentSelected = this.store.getState().selectedCardId;

    this.cardsData.forEach(card => {
      const btn = document.createElement('button');
      btn.className = `card-select-btn ${card.id === currentSelected ? 'active' : ''}`;
      const costBig = BigNum.fromJSON(card.cost);

      btn.innerHTML = `
        <span class="card-badge ${card.rarity.toLowerCase()}">${card.rarity}</span>
        <div class="card-btn-name">${card.name}</div>
        <div class="card-btn-cost">Costo: ${costBig.m === 0 ? 'Gratis' : costBig.format() + ' 🪙'}</div>
      `;

      btn.addEventListener('click', () => {
        this.store.selectCard(card.id);
        this.renderCardSelectors();
        this.setupNewCard();
      });

      container.appendChild(btn);
    });
  }

  setupNewCard() {
    const state = this.store.getState();
    const cardDef = this.cardsData.find(c => c.id === state.selectedCardId) || this.cardsData[0];
    const cost = BigNum.fromJSON(cardDef.cost);

    // Verificar si puede costear la tarjeta (si cuesta)
    if (cost.gt(0)) {
      if (!this.store.spendCoins(cost)) {
        document.getElementById('scratch-result-banner').textContent = `No tienes suficientes monedas (${cost.format()} 🪙) para abrir esta tarjeta.`;
        return;
      }
    }

    // Preparar radio de raspado según mejoras
    let radius = 26;
    if (state.upgrades['upg_scratch_radius_1']) {
      radius = Math.round(radius * 1.35);
    }
    this.scratchCanvas.setRadius(radius);
    this.scratchCanvas.setTheme(cardDef.theme.foilColor, cardDef.theme.scratchTexture);
    this.scratchCanvas.resetCover();

    // Actualizar Encabezado de la Tarjeta
    document.getElementById('active-card-name').textContent = cardDef.name;
    document.getElementById('active-card-jackpot').textContent = `Bote x${cardDef.jackpotMultiplier}`;
    document.getElementById('scratch-result-banner').className = 'scratch-result-banner';
    document.getElementById('scratch-result-banner').textContent = '¡Raspa la lámina protectora para reclamar tu premio!';

    // Generar cuadrícula de símbolos aleatorios
    const cols = cardDef.scratchGrid.cols;
    const rows = cardDef.scratchGrid.rows;
    const totalCells = cols * rows;

    const gridEl = document.getElementById('symbols-grid');
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.innerHTML = '';

    const cellsData = [];
    const symbolCounts = {};

    for (let i = 0; i < totalCells; i++) {
      // Elegir símbolo con ponderaciones
      let sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (cardDef.modifier === 'high_risk' && Math.random() < 0.4) {
        sym = SYMBOLS.find(s => s.icon === '💀') || sym;
      } else if (cardDef.modifier === 'clover_boost' && Math.random() < 0.35) {
        sym = SYMBOLS.find(s => s.icon === '🍀') || sym;
      }

      symbolCounts[sym.icon] = (symbolCounts[sym.icon] || 0) + 1;

      const cell = document.createElement('div');
      cell.className = 'symbol-cell';
      cell.innerHTML = `
        <span class="symbol-icon">${sym.icon}</span>
        <span class="symbol-value">${sym.mult >= 0 ? '+' + (sym.mult * 100) + '%' : '-' + Math.abs(sym.mult * 100) + '%'}</span>
      `;
      gridEl.appendChild(cell);

      cellsData.push({ symbol: sym, element: cell });
    }

    this.currentCardInstance = {
      cardDef,
      cellsData,
      symbolCounts,
      isResolved: false
    };

    document.getElementById('scratch-progress-text').textContent = '0%';
    document.getElementById('scratch-progress-fill').style.width = '0%';
  }

  handleScratchProgress(percent) {
    document.getElementById('scratch-progress-text').textContent = `${percent}%`;
    document.getElementById('scratch-progress-fill').style.width = `${percent}%`;

    // Efecto de chispas en la tarjeta durante el raspado
    if (Math.random() < 0.25) {
      const rx = Math.random() * 480 + 20;
      const ry = Math.random() * 340 + 20;
      this.particleSystem.explode(rx, ry, 3, 'gold');
    }
  }

  handleCardRevealed() {
    if (!this.currentCardInstance || this.currentCardInstance.isResolved) return;
    this.currentCardInstance.isResolved = true;

    const { cardDef, cellsData, symbolCounts } = this.currentCardInstance;
    const state = this.store.getState();

    // Cálculo del resultado
    let baseReward = BigNum.fromJSON(cardDef.baseReward);
    let totalMult = 1.0;
    let cloversWon = cardDef.cloverReward || 0;
    let isJackpot = false;

    // Aplicar mejoras compradas
    if (state.upgrades['upg_coin_value_1']) baseReward = baseReward.mul(1.5);
    if (state.upgrades['upg_clover_luck_1']) cloversWon = Math.round(cloversWon * 2.0);

    // Multiplicador de prestigio
    baseReward = baseReward.mul(this.store.prestigeMultiplier);

    // Detección de combinaciones ganadoras (3 o más símbolos iguales)
    let highestCount = 0;
    let winningIcon = '';

    for (const [icon, count] of Object.entries(symbolCounts)) {
      if (count >= 3 && count > highestCount) {
        highestCount = count;
        winningIcon = icon;
      }
    }

    if (highestCount >= 3) {
      isJackpot = true;
      let jackpotBoost = cardDef.jackpotMultiplier;
      if (state.upgrades['upg_jackpot_fever']) jackpotBoost *= 3.0;
      totalMult *= jackpotBoost;

      // Resaltar celdas ganadoras
      cellsData.forEach(c => {
        if (c.symbol.icon === winningIcon) {
          c.element.classList.add('matched');
        }
      });
    }

    // Efecto de modificadores de tarjeta
    if (cardDef.modifier === 'clover_boost') {
      cloversWon = Math.round(cloversWon * 2.5);
    } else if (cardDef.modifier === 'high_risk') {
      const skulls = symbolCounts['💀'] || 0;
      if (skulls > 0) {
        const penaltyReduc = (state.prestigeUpgrades['pr_auto_cleanse'] || 0) * 0.20;
        totalMult *= Math.max(0.2, 1 - (skulls * (0.25 - penaltyReduc)));
      }
    }

    const finalCoinsWon = baseReward.mul(new BigNum(Math.max(0.1, totalMult)));

    // Registrar en el Store
    this.store.recordCardCompleted(cardDef.id, cardDef.rarity, finalCoinsWon, cloversWon, isJackpot);

    // Actualizar Banner
    const banner = document.getElementById('scratch-result-banner');
    banner.classList.add('win');

    if (isJackpot) {
      banner.innerHTML = `🎉 ¡PREMIO MAYOR (${winningIcon} x${highestCount})! Ganaste <strong>${finalCoinsWon.format()} 🪙</strong> y <strong>+${cloversWon} 🍀</strong>`;
      this.particleSystem.explode(260, 190, 75, 'gold');
    } else {
      banner.innerHTML = `✨ ¡Tarjeta completada! Ganaste <strong>${finalCoinsWon.format()} 🪙</strong> y <strong>+${cloversWon} 🍀</strong>`;
      this.particleSystem.explode(260, 190, 35, cardDef.theme.scratchTexture === 'emerald' ? 'clover' : 'gold');
    }

    // Vibración háptica en dispositivos móviles compatibles
    if (navigator.vibrate) {
      navigator.vibrate(isJackpot ? [100, 50, 100] : 60);
    }
  }

  renderHUD(state) {
    document.getElementById('hud-coins').textContent = state.coins.format();
    document.getElementById('hud-clovers').textContent = state.clovers.toLocaleString('es-ES');
    document.getElementById('hud-shards').textContent = state.goldenShards.toLocaleString('es-ES');
    this.renderShop();
  }

  renderShop() {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';
    const state = this.store.getState();

    if (this.currentTab === 'helpers') {
      HELPER_DEFINITIONS.forEach(def => {
        const count = state.helpers[def.id] || 0;
        const cost = getHelperCost(def, count);
        const canAfford = state.coins.gte(cost);

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
          <div class="shop-card-icon">${def.icon}</div>
          <div class="shop-card-details">
            <div class="shop-card-title">
              <span>${def.name}</span>
              <span class="shop-card-count">Nv. ${count}</span>
            </div>
            <p class="shop-card-desc">${def.description}</p>
            <span class="shop-card-rate">+${def.baseCoinsPerSec.mul(new BigNum(count > 0 ? count : 1)).format()} 🪙/s &bull; Auto: +${def.baseScratchPower}%/s</span>
          </div>
          <button class="btn-buy" ${!canAfford ? 'disabled' : ''}>
            ${cost.format()} 🪙
          </button>
        `;

        card.querySelector('button').addEventListener('click', () => {
          if (this.store.buyHelper(def.id, cost)) {
            this.particleSystem.explode(450, 200, 10, 'gold');
          }
        });

        container.appendChild(card);
      });
    } else {
      // Pestaña de Mejoras
      UPGRADE_DEFINITIONS.forEach(def => {
        const isBought = state.upgrades[def.id];
        const canAfford = state.coins.gte(def.cost);

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
          <div class="shop-card-icon">${def.icon}</div>
          <div class="shop-card-details">
            <div class="shop-card-title">
              <span>${def.name}</span>
              ${isBought ? '<span class="shop-card-count" style="color: var(--clover-green);">Comprado</span>' : ''}
            </div>
            <p class="shop-card-desc">${def.description}</p>
          </div>
          <button class="btn-buy" ${isBought || !canAfford ? 'disabled' : ''}>
            ${isBought ? 'Adquirido' : def.cost.format() + ' 🪙'}
          </button>
        `;

        if (!isBought) {
          card.querySelector('button').addEventListener('click', () => {
            if (this.store.buyUpgrade(def.id, def.cost)) {
              this.particleSystem.explode(450, 200, 15, 'clover');
            }
          });
        }

        container.appendChild(card);
      });
    }
  }

  renderPrestigeModal() {
    const state = this.store.getState();
    const shardsEarnable = calculatePrestigeGain(state.lifetimeCoins);

    document.getElementById('prestige-gain-display').textContent = `+${shardsEarnable.toLocaleString()} 🔮`;
    document.getElementById('prestige-multiplier-display').textContent = `x${this.store.prestigeMultiplier.toFixed(2)}`;

    const container = document.getElementById('prestige-upgrades-container');
    container.innerHTML = '';

    PRESTIGE_UPGRADES.forEach(def => {
      const lvl = state.prestigeUpgrades[def.id] || 0;
      const cost = def.costPerLevel * (lvl + 1);
      const isMax = lvl >= def.maxLevel;
      const canAfford = state.goldenShards >= cost && !isMax;

      const row = document.createElement('div');
      row.style.background = 'hsla(230, 20%, 20%, 0.6)';
      row.style.padding = '8px 12px';
      row.style.borderRadius = '8px';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      row.innerHTML = `
        <div>
          <strong style="color: #fff;">${def.name} (Nv. ${lvl}/${def.maxLevel})</strong>
          <p style="font-size: 0.75rem; color: var(--text-muted);">${def.description}</p>
        </div>
        <button class="btn-buy" style="background: var(--prestige-purple);" ${!canAfford ? 'disabled' : ''}>
          ${isMax ? 'MAX' : `${cost} 🔮`}
        </button>
      `;

      if (canAfford) {
        row.querySelector('button').addEventListener('click', () => {
          this.store.buyPrestigeUpgrade(def.id, cost);
          this.renderPrestigeModal();
        });
      }

      container.appendChild(row);
    });
  }

  renderStatsModal() {
    const state = this.store.getState();
    const { totalCoins, totalScratchSpeed } = calculateTotalPassiveIncome(
      state.helpers,
      state.upgrades,
      this.store.prestigeMultiplier
    );

    document.getElementById('stat-cards-count').textContent = state.cardsScratched.toLocaleString();
    document.getElementById('stat-lifetime-coins').textContent = `${state.lifetimeCoins.format()} 🪙`;
    document.getElementById('stat-passive-rate').textContent = `${totalCoins.format()} 🪙 / s`;
    document.getElementById('stat-auto-speed').textContent = `${totalScratchSpeed.toFixed(1)}% / s`;

    const histContainer = document.getElementById('history-container');
    histContainer.innerHTML = '';

    if (!state.history || state.history.length === 0) {
      histContainer.innerHTML = '<span style="color: var(--text-muted);">Sin historial aún.</span>';
      return;
    }

    state.history.forEach(item => {
      const div = document.createElement('div');
      div.style.padding = '4px 0';
      div.style.borderBottom = '1px solid hsla(230, 20%, 30%, 0.4)';
      const winBig = BigNum.fromJSON(item.coinsWon);
      div.innerHTML = `<strong>${item.cardRarity}</strong>: +${winBig.format()} 🪙, +${item.cloversWon} 🍀 ${item.isJackpot ? '⭐ BOTE' : ''}`;
      histContainer.appendChild(div);
    });
  }

  gameLoop(timestamp) {
    const dt = (timestamp - this.lastLoopTime) / 1000;
    this.lastLoopTime = timestamp;

    if (dt > 0 && dt < 1) {
      const state = this.store.getState();
      const { totalCoins, totalScratchSpeed } = calculateTotalPassiveIncome(
        state.helpers,
        state.upgrades,
        this.store.prestigeMultiplier
      );

      // 1. Ingresos pasivos por segundo
      if (totalCoins.gt(0)) {
        const frameIncome = totalCoins.mul(new BigNum(dt));
        this.store.addCoins(frameIncome);
      }

      // 2. Auto-raspado continuo de ayudantes mecánicos
      if (totalScratchSpeed > 0 && this.scratchCanvas && !this.scratchCanvas.isRevealed) {
        this.autoScratchAccumulator += totalScratchSpeed * dt;
        if (this.autoScratchAccumulator >= 1) {
          const power = Math.floor(this.autoScratchAccumulator);
          this.scratchCanvas.autoScratch(power);
          this.autoScratchAccumulator -= power;
        }
      }

      // 3. Si la tarjeta está revelada y tenemos ayudantes rápidos, avanzar de tarjeta automáticamente
      if (this.scratchCanvas && this.scratchCanvas.isRevealed && totalScratchSpeed >= 15) {
        this.autoNextTimer = (this.autoNextTimer || 0) + dt;
        if (this.autoNextTimer > 2.5) {
          this.autoNextTimer = 0;
          this.setupNewCard();
        }
      }
    }

    // 4. Actualizar y renderizar partículas
    this.particleSystem.update();
    this.particleSystem.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.init();
});
