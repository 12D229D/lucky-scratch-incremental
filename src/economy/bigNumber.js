// BigNumber: Sistema de precisión numérica infinita/arbitraria para juegos incrementales ("Number Go Up")
// Representa números como m * 10^e (mantisa y exponente)

export class BigNum {
  /**
   * @param {number|string|BigNum} mantissa 
   * @param {number} exponent 
   */
  constructor(mantissa = 0, exponent = 0) {
    if (mantissa instanceof BigNum) {
      this.m = mantissa.m;
      this.e = mantissa.e;
      return;
    }

    if (typeof mantissa === 'string') {
      const parsed = BigNum.fromString(mantissa);
      this.m = parsed.m;
      this.e = parsed.e;
      return;
    }

    let m = Number(mantissa);
    let e = Math.floor(exponent);

    if (isNaN(m) || !isFinite(m)) {
      m = 0;
      e = 0;
    }

    this.m = m;
    this.e = e;
    this.normalize();
  }

  normalize() {
    if (this.m === 0) {
      this.e = 0;
      return this;
    }

    // Convert scientific notation if m has huge scale
    let absM = Math.abs(this.m);
    if (absM >= 10) {
      const shift = Math.floor(Math.log10(absM));
      this.m /= Math.pow(10, shift);
      this.e += shift;
    } else if (absM < 1 && absM > 0) {
      const shift = Math.floor(Math.log10(absM));
      this.m /= Math.pow(10, shift);
      this.e += shift;
    }

    // Mantener mantisa redondeada a 8 decimales para evitar acumulación de errores de coma flotante
    this.m = Math.round(this.m * 1e8) / 1e8;
    if (this.m === 0) {
      this.e = 0;
    }
    return this;
  }

  static from(val) {
    if (val instanceof BigNum) return val.clone();
    return new BigNum(val);
  }

  static fromString(str) {
    if (!str || typeof str !== 'string') return new BigNum(0);
    const trimmed = str.trim();
    if (trimmed.includes('e')) {
      const parts = trimmed.split('e');
      return new BigNum(parseFloat(parts[0]), parseInt(parts[1], 10));
    }
    const val = parseFloat(trimmed);
    return new BigNum(val);
  }

  clone() {
    return new BigNum(this.m, this.e);
  }

  add(other) {
    const o = BigNum.from(other);
    if (this.m === 0) return o;
    if (o.m === 0) return this.clone();

    const diff = this.e - o.e;
    if (diff > 15) return this.clone();
    if (diff < -15) return o.clone();

    if (diff >= 0) {
      const newM = this.m + o.m * Math.pow(10, -diff);
      return new BigNum(newM, this.e);
    } else {
      const newM = this.m * Math.pow(10, diff) + o.m;
      return new BigNum(newM, o.e);
    }
  }

  sub(other) {
    const o = BigNum.from(other);
    if (o.m === 0) return this.clone();
    if (this.m === 0) return new BigNum(-o.m, o.e);

    const diff = this.e - o.e;
    if (diff > 15) return this.clone();
    if (diff < -15) return new BigNum(-o.m, o.e);

    if (diff >= 0) {
      const newM = this.m - o.m * Math.pow(10, -diff);
      return new BigNum(newM, this.e);
    } else {
      const newM = this.m * Math.pow(10, diff) - o.m;
      return new BigNum(newM, o.e);
    }
  }

  mul(other) {
    const o = BigNum.from(other);
    if (this.m === 0 || o.m === 0) return new BigNum(0);
    return new BigNum(this.m * o.m, this.e + o.e);
  }

  div(other) {
    const o = BigNum.from(other);
    if (o.m === 0) throw new Error("Division by zero in BigNum");
    if (this.m === 0) return new BigNum(0);
    return new BigNum(this.m / o.m, this.e - o.e);
  }

  pow(power) {
    const p = Number(power);
    if (p === 0) return new BigNum(1);
    if (this.m === 0) return new BigNum(0);

    const totalLog = Math.log10(Math.abs(this.m)) + this.e;
    const newLog = totalLog * p;
    const newExp = Math.floor(newLog);
    const newMantissa = Math.pow(10, newLog - newExp) * (this.m < 0 && p % 2 !== 0 ? -1 : 1);
    return new BigNum(newMantissa, newExp);
  }

  gte(other) {
    const o = BigNum.from(other);
    if (this.m === 0 && o.m === 0) return true;
    if (this.m < 0 && o.m >= 0) return false;
    if (this.m >= 0 && o.m < 0) return true;

    if (this.e !== o.e) {
      return this.m >= 0 ? this.e > o.e : this.e < o.e;
    }
    return this.m >= o.m;
  }

  gt(other) {
    const o = BigNum.from(other);
    if (this.m === o.m && this.e === o.e) return false;
    return this.gte(o);
  }

  lte(other) {
    const o = BigNum.from(other);
    return o.gte(this);
  }

  lt(other) {
    const o = BigNum.from(other);
    return o.gt(this);
  }

  eq(other) {
    const o = BigNum.from(other);
    return Math.abs(this.m - o.m) < 1e-6 && this.e === o.e;
  }

  toNumber() {
    return this.m * Math.pow(10, this.e);
  }

  // Formateo con Sufijos Incrementales (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc...) o Científico
  format(decimals = 2, scientificAt = 36) {
    if (this.m === 0) return "0";

    const SUFFIXES = [
      "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
      "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", "Vg"
    ];

    if (this.e < 3) {
      const val = this.toNumber();
      return val.toLocaleString('es-ES', { maximumFractionDigits: decimals });
    }

    const tier = Math.floor(this.e / 3);
    if (tier < SUFFIXES.length && this.e < scientificAt) {
      const suffix = SUFFIXES[tier];
      const remainder = this.e % 3;
      const scaledM = this.m * Math.pow(10, remainder);
      return `${scaledM.toFixed(decimals)} ${suffix}`;
    }

    // Notación científica estándar para números astronómicos
    return `${this.m.toFixed(2)}e+${this.e}`;
  }

  toJSON() {
    return { m: this.m, e: this.e };
  }

  static fromJSON(json) {
    if (!json) return new BigNum(0);
    return new BigNum(json.m || 0, json.e || 0);
  }
}
