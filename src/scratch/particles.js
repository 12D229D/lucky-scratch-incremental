export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Crea una explosión de partículas tipo confeti, chispas doradas o estrellas
   */
  explode(x, y, count = 35, type = 'gold') {
    const colors = type === 'clover'
      ? ['#2ecc71', '#27ae60', '#a8e6cf', '#1abc9c', '#f1c40f']
      : type === 'cursed'
      ? ['#8e44ad', '#9b59b6', '#e74c3c', '#2c3e50', '#ff0055']
      : ['#f1c40f', '#f39c12', '#ffeaa7', '#e67e22', '#ffffff', '#00d2d3'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      const size = Math.random() * 6 + 3;
      const life = Math.random() * 40 + 35; // Frames de vida
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2), // impulso ascendente
        gravity: 0.18,
        friction: 0.96,
        size,
        color,
        life,
        maxLife: life,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? 'circle' : 'rect'
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.rotation += p.rotSpeed;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      }
      this.ctx.restore();
    }
  }
}
