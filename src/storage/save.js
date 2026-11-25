import { BigNum } from '../economy/bigNumber.js';

const LOCAL_STORAGE_KEY = 'lucky_scratch_incremental_save_v1';

export class GameStorage {
  /**
   * Guarda el estado del juego en localStorage (con formato de respaldo compatible SQLite)
   */
  static save(state) {
    try {
      const serializable = {
        version: 'v1.0.0',
        savedAt: Date.now(),
        coins: state.coins.toJSON(),
        clovers: state.clovers,
        goldenShards: state.goldenShards,
        lifetimeCoins: state.lifetimeCoins.toJSON(),
        cardsScratched: state.cardsScratched,
        selectedCardId: state.selectedCardId,
        helpers: state.helpers,
        upgrades: state.upgrades,
        prestigeUpgrades: state.prestigeUpgrades,
        history: (state.history || []).slice(-30) // Últimos 30 rascas
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serializable));
      return true;
    } catch (err) {
      console.error('Error al guardar partida:', err);
      return false;
    }
  }

  /**
   * Carga el estado guardado o null si no existe
   */
  static load() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      return {
        version: data.version || 'v1.0.0',
        savedAt: data.savedAt || Date.now(),
        coins: BigNum.fromJSON(data.coins),
        clovers: Number(data.clovers) || 0,
        goldenShards: Number(data.goldenShards) || 0,
        lifetimeCoins: BigNum.fromJSON(data.lifetimeCoins),
        cardsScratched: Number(data.cardsScratched) || 0,
        selectedCardId: data.selectedCardId || 'card_basic',
        helpers: data.helpers || {},
        upgrades: data.upgrades || {},
        prestigeUpgrades: data.prestigeUpgrades || {},
        history: data.history || []
      };
    } catch (err) {
      console.warn('Error al cargar datos guardados, iniciando nueva partida:', err);
      return null;
    }
  }

  /**
   * Exporta la partida en un archivo de texto JSON codificado en Base64
   */
  static exportSave(state) {
    const raw = JSON.stringify({
      version: 'v1.0.0',
      exportedAt: new Date().toISOString(),
      state: {
        coins: state.coins.toJSON(),
        clovers: state.clovers,
        goldenShards: state.goldenShards,
        lifetimeCoins: state.lifetimeCoins.toJSON(),
        cardsScratched: state.cardsScratched,
        selectedCardId: state.selectedCardId,
        helpers: state.helpers,
        upgrades: state.upgrades,
        prestigeUpgrades: state.prestigeUpgrades
      }
    });

    return btoa(encodeURIComponent(raw));
  }

  /**
   * Importa una partida desde una cadena en Base64
   */
  static importSave(b64String) {
    try {
      const decoded = decodeURIComponent(atob(b64String.trim()));
      const data = JSON.parse(decoded);
      if (!data || !data.state) return null;

      const s = data.state;
      return {
        coins: BigNum.fromJSON(s.coins),
        clovers: Number(s.clovers) || 0,
        goldenShards: Number(s.goldenShards) || 0,
        lifetimeCoins: BigNum.fromJSON(s.lifetimeCoins),
        cardsScratched: Number(s.cardsScratched) || 0,
        selectedCardId: s.selectedCardId || 'card_basic',
        helpers: s.helpers || {},
        upgrades: s.upgrades || {},
        prestigeUpgrades: s.prestigeUpgrades || {},
        history: []
      };
    } catch (e) {
      console.error('Error al decodificar partida importada:', e);
      return null;
    }
  }

  /**
   * Reinicio total
   */
  static clear() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}
