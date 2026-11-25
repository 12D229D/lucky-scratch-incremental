import { BigNum } from './bigNumber.js';

export const PRESTIGE_UPGRADES = [
  {
    id: 'pr_alchemy_base',
    name: 'Transmutación de Plomo a Oro',
    description: 'Aumenta permanentemente toda la producción de monedas en +25% por nivel.',
    costPerLevel: 1, // En Fragmentos de Prisma Dorado
    maxLevel: 20,
    effectPerLevel: 0.25
  },
  {
    id: 'pr_clover_infusion',
    name: 'Infusión Eterna de Trébol',
    description: 'Cada nivel otorga un +50% de tréboles de la suerte permanentes.',
    costPerLevel: 2,
    maxLevel: 10,
    effectPerLevel: 0.50
  },
  {
    id: 'pr_auto_cleanse',
    name: 'Purificación Alquímica',
    description: 'Reduce la penalización de las tarjetas malditas en un 20% por nivel y duplica su recompensa.',
    costPerLevel: 5,
    maxLevel: 5,
    effectPerLevel: 0.20
  },
  {
    id: 'pr_cosmic_resonance',
    name: 'Resonancia Cósmica',
    description: 'La velocidad de raspado de todos los ayudantes aumenta un +50% adicional por nivel.',
    costPerLevel: 10,
    maxLevel: 5,
    effectPerLevel: 0.50
  }
];

/**
 * Calcula cuántos Fragmentos de Prisma Dorado (Golden Shards) se obtendrían al reiniciar
 * Fórmula: floor( 15 * sqrt( totalCoinsEarned / 1e7 ) )
 */
export function calculatePrestigeGain(lifetimeCoins) {
  const minCoinsThreshold = new BigNum(1, 7); // 10 millones de monedas
  if (lifetimeCoins.lt(minCoinsThreshold)) {
    return 0;
  }

  // Obtenemos una aproximación numérica logarítmica para raíces de BigNum
  const logVal = Math.log10(lifetimeCoins.m) + lifetimeCoins.e;
  const logThreshold = 7;
  const diff = logVal - logThreshold;

  if (diff < 0) return 0;
  const shards = Math.floor(Math.pow(10, diff * 0.5) * 5);
  return Math.max(1, shards);
}

/**
 * Multiplicador global otorgado por los Golden Shards acumulados y mejoras de prestigio
 */
export function calculatePrestigeMultiplier(goldenShards, prestigeUpgradesPurchased = {}) {
  // Cada fragmento libre da +10% de producción
  let mult = 1.0 + (goldenShards * 0.10);

  // Efecto de mejoras de prestigio
  const alchemyLvl = prestigeUpgradesPurchased['pr_alchemy_base'] || 0;
  mult += alchemyLvl * 0.25;

  return mult;
}
