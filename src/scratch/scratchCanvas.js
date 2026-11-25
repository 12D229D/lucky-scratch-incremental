export class ScratchCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.radius = options.radius || 24;
    this.foilColor = options.foilColor || '#a0aab2';
    this.texture = options.texture || 'silver';
    this.onProgress = options.onProgress || (() => {});
    this.onRevealed = options.onRevealed || (() => {});
    
    this.isDrawing = false;
    this.isRevealed = false;
    this.lastPoint = null;
    this.scratchedPixels = 0;
    this.totalPixels = 0;

    this.checkInterval = 0;
    this._bindEvents();
  }

  _bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const start = (e) => {
      if (this.isRevealed) return;
      this.isDrawing = true;
      this.lastPoint = getPos(e);
      this.scratchAt(this.lastPoint.x, this.lastPoint.y);
    };

    const move = (e) => {
      if (!this.isDrawing || this.isRevealed) return;
      e.preventDefault();
      const current = getPos(e);
      this.scratchLine(this.lastPoint.x, this.lastPoint.y, current.x, current.y);
      this.lastPoint = current;
    };

    const stop = () => {
      this.isDrawing = false;
      this.lastPoint = null;
    };

    this.canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', stop);
  }

  setTheme(foilColor, texture) {
    this.foilColor = foilColor;
    this.texture = texture;
  }

  setRadius(r) {
    this.radius = r;
  }

  /**
   * Inicializa la cubierta raspable con texturas procedurales metalizadas
   */
  resetCover() {
    this.isRevealed = false;
    this.ctx.globalCompositeOperation = 'source-over';
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.totalPixels = w * h;

    // Gradiente de brillo metálico según el tipo
    const grad = this.ctx.createLinearGradient(0, 0, w, h);

    if (this.texture === 'emerald') {
      grad.addColorStop(0, '#1abc9c');
      grad.addColorStop(0.3, '#2ecc71');
      grad.addColorStop(0.5, '#27ae60');
      grad.addColorStop(0.8, '#16a085');
      grad.addColorStop(1, '#2ecc71');
    } else if (this.texture === 'obsidian') {
      grad.addColorStop(0, '#2c3e50');
      grad.addColorStop(0.4, '#4a154b');
      grad.addColorStop(0.7, '#1a1a2e');
      grad.addColorStop(1, '#8e44ad');
    } else if (this.texture === 'starlight') {
      grad.addColorStop(0, '#0984e3');
      grad.addColorStop(0.3, '#6c5ce7');
      grad.addColorStop(0.6, '#00cec9');
      grad.addColorStop(1, '#a29bfe');
    } else if (this.texture === 'pure_gold') {
      grad.addColorStop(0, '#f1c40f');
      grad.addColorStop(0.2, '#fff1a8');
      grad.addColorStop(0.5, '#f39c12');
      grad.addColorStop(0.8, '#d35400');
      grad.addColorStop(1, '#f1c40f');
    } else {
      // Plata clásica brillante
      grad.addColorStop(0, '#bdc3c7');
      grad.addColorStop(0.3, '#ecf0f1');
      grad.addColorStop(0.6, '#95a5a6');
      grad.addColorStop(0.9, '#bdc3c7');
      grad.addColorStop(1, '#7f8c8d');
    }

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    // Patrón decorativo en la superficie de la lámina
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let x = 10; x < w; x += 24) {
      for (let y = 10; y < h; y += 24) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Texto de invitación
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(20, 20, 25, 0.45)';
    this.ctx.font = 'bold 20px "Outfit", "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('✨ ¡RASPA AQUÍ CON EL DEDO O RATÓN! ✨', w / 2, h / 2);
    this.ctx.restore();

    this.onProgress(0);
  }

  scratchAt(x, y) {
    if (this.isRevealed) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this._throttleProgressCheck();
  }

  scratchLine(x1, y1, x2, y2) {
    if (this.isRevealed) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.lineWidth = this.radius * 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.restore();

    this._throttleProgressCheck();
  }

  /**
   * Raspado automático por ayudantes mecánicos / láser
   */
  autoScratch(powerPercent) {
    if (this.isRevealed) return;
    const count = Math.ceil(powerPercent * 3);
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * this.canvas.width;
      const ry = Math.random() * this.canvas.height;
      this.scratchAt(rx, ry);
    }
  }

  _throttleProgressCheck() {
    this.checkInterval++;
    if (this.checkInterval % 6 === 0) {
      this.checkProgress();
    }
  }

  /**
   * Muestreo rápido de píxeles transparentes mediante paso de muestra (step = 8)
   */
  checkProgress() {
    if (this.isRevealed) return 100;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const step = 8;
    const imgData = this.ctx.getImageData(0, 0, w, h).data;

    let transparentCount = 0;
    let totalSamples = 0;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const index = (y * w + x) * 4 + 3; // Canal Alpha
        if (imgData[index] < 128) {
          transparentCount++;
        }
        totalSamples++;
      }
    }

    const percent = Math.min(100, Math.round((transparentCount / totalSamples) * 100));
    this.onProgress(percent);

    // Auto-revelado cuando se supera el 75%
    if (percent >= 75 && !this.isRevealed) {
      this.revealAll();
    }

    return percent;
  }

  /**
   * Despeja por completo la cubierta al ganar o alcanzar el 75%
   */
  revealAll() {
    this.isRevealed = true;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.onProgress(100);
    this.onRevealed();
  }
}
