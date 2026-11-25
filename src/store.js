import { BigNum } from './economy/bigNumber.js';
import { GameStorage } from './storage/save.js';
import { calculatePrestigeMultiplier } from './economy/prestige.js';

export class GameStore {
  constructor(initialCards = []) {
    this.cards = initialCards;
    this.listeners = new Set();

    // Estado inicial por defecto
    this.state = {
      coins: new BigNum(25, 0), // Monedas iniciales para empezar
      clovers: 0,
      goldenShards: 0,
      lifetimeCoins: new BigNum(25, 0),
      cardsScratched: 0,
      selectedCardId: 'card_basic',
      helpers: {},
      upgrades: {},
      prestigeUpgrades: {},
      history: []
    };

    this.prestigeMultiplier = 1.0;
  }

  init(loadedState) {
    if (loadedState) {
      this.state = {
        ...this.state,
        ...loadedState
      };
    }
    this.updateMultipliers();
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState() {
    return this.state;
  }

  updateMultipliers() {
    this.prestigeMultiplier = calculatePrestigeMultiplier(
      this.state.goldenShards,
      this.state.prestigeUpgrades
    );
  }

  // --- ACCIONES PURAS DEL STORE ---

  addCoins(amount) {
    const add = BigNum.from(amount);
    if (add.m <= 0) return;
    this.state.coins = this.state.coins.add(add);
    this.state.lifetimeCoins = this.state.lifetimeCoins.add(add);
    this.notify();
  }

  spendCoins(amount) {
    const spend = BigNum.from(amount);
    if (this.state.coins.lt(spend)) return false;
    this.state.coins = this.state.coins.sub(spend);
    this.notify();
    return true;
  }

  addClovers(count) {
    this.state.clovers += count;
    this.notify();
  }

  selectCard(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return;
    this.state.selectedCardId = cardId;
    this.notify();
  }

  buyHelper(helperId, cost) {
    if (this.spendCoins(cost)) {
      this.state.helpers[helperId] = (this.state.helpers[helperId] || 0) + 1;
      this.notify();
      return true;
    }
    return false;
  }

  buyUpgrade(upgradeId, cost) {
    if (this.state.upgrades[upgradeId]) return false;
    if (this.spendCoins(cost)) {
      this.state.upgrades[upgradeId] = true;
      this.updateMultipliers();
      this.notify();
      return true;
    }
    return false;
  }

  buyPrestigeUpgrade(prestigeId, cost) {
    if (this.state.goldenShards < cost) return false;
    this.state.goldenShards -= cost;
    this.state.prestigeUpgrades[prestigeId] = (this.state.prestigeUpgrades[prestigeId] || 0) + 1;
    this.updateMultipliers();
    this.notify();
    return true;
  }

  recordCardCompleted(cardId, cardRarity, coinsWon, cloversWon, isJackpot) {
    this.state.cardsScratched++;
    this.addCoins(coinsWon);
    this.addClovers(cloversWon);

    this.state.history.unshift({
      cardId,
      cardRarity,
      coinsWon: coinsWon.toJSON(),
      cloversWon,
      isJackpot,
      timestamp: Date.now()
    });

    if (this.state.history.length > 25) {
      this.state.history.pop();
    }

    this.notify();
  }

  triggerPrestige(shardsEarned) {
    if (shardsEarned <= 0) return false;

    // Se reinician monedas, ayudantes y mejoras normales; se conservan goldenShards, clovers y mejoras de prestigio
    this.state.goldenShards += shardsEarned;
    this.state.coins = new BigNum(50, 0); // Inicio generoso post-prestigio
    this.state.helpers = {};
    this.state.upgrades = {};
    this.updateMultipliers();
    this.notify();
    GameStorage.save(this.state);
    return true;
  }

  resetHard() {
    GameStorage.clear();
    this.state = {
      coins: new BigNum(25, 0),
      clovers: 0,
      goldenShards: 0,
      lifetimeCoins: new BigNum(25, 0),
      cardsScratched: 0,
      selectedCardId: 'card_basic',
      helpers: {},
      upgrades: {},
      prestigeUpgrades: {},
      history: []
    };
    this.updateMultipliers();
    this.notify();
  }
}
