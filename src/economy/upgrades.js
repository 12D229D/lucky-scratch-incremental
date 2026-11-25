import { BigNum } from './bigNumber.js';

export const HELPER_DEFINITIONS = [
  {
    id: 'helper_finger',
    name: 'Dedo Mecánico de Latón',
    description: 'Un émbolo a cuerda que raspa lentamente las tarjetas en piloto automático.',
    baseCost: new BigNum(15, 0),
    costMult: 1.15,
    baseScratchPower: 0.8, // % raspado por segundo
    baseCoinsPerSec: new BigNum(1, 0),
    icon: '👆'
  },
  {
    id: 'helper_coin_scraper',
    name: 'Moneda Afilada de Cobre',
    description: 'Gira vertiginosamente sobre el papel revelando premios rápidamente.',
    baseCost: new BigNum(120, 0),
    costMult: 1.18,
    baseScratchPower: 2.5,
    baseCoinsPerSec: new BigNum(12, 0),
    icon: '🪙'
  },
  {
    id: 'helper_spatula',
    name: 'Espátula Alquímica de Oro',
    description: 'Barre superficies enteras de película metalizada con gran elegancia.',
    baseCost: new BigNum(1.5, 3),
    costMult: 1.20,
    baseScratchPower: 7.0,
    baseCoinsPerSec: new BigNum(150, 0),
    icon: '🗡️'
  },
  {
    id: 'helper_laser',
    name: 'Raspador Láser Óptico',
    description: 'Haz térmico de precisión que vaporiza la lámina protectora al instante.',
    baseCost: new BigNum(3.5, 4),
    costMult: 1.22,
    baseScratchPower: 20.0,
    baseCoinsPerSec: new BigNum(2.5, 3),
    icon: '⚡'
  },
  {
    id: 'helper_drone',
    name: 'Enjambre de Drones Mineros',
    description: 'Flotilla automatizada que escanea y raspa cuadrículas simultáneamente.',
    baseCost: new BigNum(8.0, 5),
    costMult: 1.25,
    baseScratchPower: 65.0,
    baseCoinsPerSec: new BigNum(6.0, 4),
    icon: '🛸'
  },
  {
    id: 'helper_ai_neural',
    name: 'IA Cuántica Auto-Raspadora',
    description: 'Red neuronal profunda sincronizada que anticipa patrones y desintegra cubiertas.',
    baseCost: new BigNum(2.5, 8),
    costMult: 1.28,
    baseScratchPower: 200.0,
    baseCoinsPerSec: new BigNum(1.8, 7),
    icon: '🤖'
  }
];

export const UPGRADE_DEFINITIONS = [
  {
    id: 'upg_coin_value_1',
    name: 'Borde Dentado',
    description: 'Aumenta el valor de las monedas de cada tarjeta en +50%.',
    cost: new BigNum(100, 0),
    multiplierType: 'coinReward',
    multiplierValue: 1.5,
    purchased: false,
    icon: '✨'
  },
  {
    id: 'upg_clover_luck_1',
    name: 'Gotas de Rocío Celta',
    description: 'Multiplica la probabilidad y recompensa de tréboles de la suerte por x2.',
    cost: new BigNum(500, 0),
    multiplierType: 'cloverReward',
    multiplierValue: 2.0,
    purchased: false,
    icon: '🍀'
  },
  {
    id: 'upg_scratch_radius_1',
    name: 'Punta de Diamante',
    description: 'Aumenta el radio del pincel de raspado manual en un +35%.',
    cost: new BigNum(2.5, 3),
    multiplierType: 'scratchRadius',
    multiplierValue: 1.35,
    purchased: false,
    icon: '💎'
  },
  {
    id: 'upg_jackpot_fever',
    name: 'Fiebre del Premio Mayor',
    description: 'Multiplica los botes especiales de coincidencia (Jackpots) por x3.',
    cost: new BigNum(5.0, 4),
    multiplierType: 'jackpotMultiplier',
    multiplierValue: 3.0,
    purchased: false,
    icon: '🎰'
  },
  {
    id: 'upg_helpers_turbo',
    name: 'Engranajes de Wolframio',
    description: 'Todos los ayudantes automatizados trabajan un 100% más rápido (x2).',
    cost: new BigNum(1.0, 6),
    multiplierType: 'helperSpeed',
    multiplierValue: 2.0,
    purchased: false,
    icon: '⚙️'
  },
  {
    id: 'upg_quantum_luck',
    name: 'Superposición de la Fortuna',
    description: 'Multiplica las ganancias globales por x5.',
    cost: new BigNum(2.0, 9),
    multiplierType: 'globalMultiplier',
    multiplierValue: 5.0,
    purchased: false,
    icon: '🌌'
  }
];

/**
 * Calcula el costo actual de un ayudante según cuántos se tienen
 */
export function getHelperCost(helperDef, currentCount) {
  const factor = Math.pow(helperDef.costMult, currentCount);
  return helperDef.baseCost.mul(new BigNum(factor));
}

/**
 * Calcula la producción pasiva por segundo total de los ayudantes
 */
export function calculateTotalPassiveIncome(helpersState, upgradesPurchased, prestigeMultiplier) {
  let totalCoins = new BigNum(0);
  let totalScratchSpeed = 0;

  let helperSpeedBoost = 1.0;
  let globalMult = prestigeMultiplier || 1.0;

  if (upgradesPurchased['upg_helpers_turbo']) helperSpeedBoost *= 2.0;
  if (upgradesPurchased['upg_quantum_luck']) globalMult *= 5.0;

  HELPER_DEFINITIONS.forEach(def => {
    const count = helpersState[def.id] || 0;
    if (count > 0) {
      const helperCoins = def.baseCoinsPerSec
        .mul(new BigNum(count))
        .mul(new BigNum(helperSpeedBoost * globalMult));
      totalCoins = totalCoins.add(helperCoins);
      totalScratchSpeed += def.baseScratchPower * count * helperSpeedBoost;
    }
  });

  return { totalCoins, totalScratchSpeed };
}
