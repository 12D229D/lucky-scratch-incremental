import { BigNum } from './bigNumber.js';
import { calculateTotalPassiveIncome } from './upgrades.js';

/**
 * Procesa el progreso acumulado fuera de línea
 * @param {number} lastSaveTimestamp 
 * @param {Object} helpers 
 * @param {Object} upgrades 
 * @param {number} prestigeMultiplier 
 * @returns {{ elapsedSeconds: number, coinsEarned: BigNum }}
 */
export function calculateOfflineEarnings(lastSaveTimestamp, helpers, upgrades, prestigeMultiplier) {
  if (!lastSaveTimestamp) {
    return { elapsedSeconds: 0, coinsEarned: new BigNum(0) };
  }

  const now = Date.now();
  const elapsedMs = Math.max(0, now - lastSaveTimestamp);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Límite de tiempo offline (máximo 24 horas = 86400 segundos)
  const cappedSeconds = Math.min(elapsedSeconds, 86400);

  if (cappedSeconds < 10) {
    // Si fue menos de 10 segundos, no se muestra modal de bienvenida offline
    return { elapsedSeconds: cappedSeconds, coinsEarned: new BigNum(0) };
  }

  const { totalCoins: coinsPerSec } = calculateTotalPassiveIncome(helpers, upgrades, prestigeMultiplier);
  
  // Eficiencia de ganancias offline (75% de la velocidad real)
  const offlineEfficiency = 0.75;
  const coinsEarned = coinsPerSec.mul(new BigNum(cappedSeconds * offlineEfficiency));

  return {
    elapsedSeconds: cappedSeconds,
    coinsEarned
  };
}
