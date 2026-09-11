import * as THREE from 'three';

// Procedural Canvas Texture Generator for high-fidelity Battle Royale visual realism
export class TextureGenerator {
  // 1. Realistic grass & tactical ground terrain texture (1024x1024 high detail)
  static createGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Rich military olive & dark forest soil gradient base
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#2d4722');
    grad.addColorStop(0.35, '#3a582c');
    grad.addColorStop(0.7, '#243b1c');
    grad.addColorStop(1, '#1b2c15');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Multi-shade noise flecks, moss patches and tactical ground variation
    const shades = [
      '#436832', '#1a2e14', '#4c7836', '#354f26', 
      '#56853e', '#2e4521', '#5e9444', '#1f3418', '#385328'
    ];
    for (let i = 0; i < 90000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 4 + 1);
    }

    // Dirt, dry soil & gravel patches
    ctx.fillStyle = 'rgba(74, 58, 38, 0.35)';
    for (let i = 0; i < 90; i++) {
      const cx = Math.random() * 1024;
      const cy = Math.random() * 1024;
      const r = Math.random() * 55 + 20;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pebbles & rock fragments
    ctx.fillStyle = 'rgba(140, 145, 150, 0.45)';
    for (let i = 0; i < 800; i++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 1024;
      ctx.beginPath();
      ctx.arc(px, py, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    this.setupTextureQuality(texture);
    return texture;
  }

  // Common helper to maximize crisp visual clarity
  static setupTextureQuality(texture: THREE.CanvasTexture): THREE.CanvasTexture {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    return texture;
  }

  // 2. Asphalt highway road with painted markings & tire tracks
  static createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark asphalt base
    ctx.fillStyle = '#1e2126';
    ctx.fillRect(0, 0, 512, 1024);

    // Aggregate gravel noise
    for (let i = 0; i < 35000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#15171a' : '#2b2e35';
      ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
    }

    // Tire tread tracks
    ctx.fillStyle = 'rgba(10, 12, 15, 0.4)';
    ctx.fillRect(80, 0, 45, 1024);
    ctx.fillRect(387, 0, 45, 1024);

    // Solid white shoulder edge lines
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(24, 0, 10, 1024);
    ctx.fillRect(478, 0, 10, 1024);

    // Double yellow center stripes
    ctx.fillStyle = '#f59e0b';
    for (let y = 0; y < 1024; y += 72) {
      ctx.fillRect(248, y, 6, 48);
      ctx.fillRect(258, y, 6, 48);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 14);
    this.setupTextureQuality(texture);
    return texture;
  }

  // 3. Heavy military concrete bunker panel texture
  static createConcreteWallTexture(tint = '#475569'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 512, 512);

    // Weathering & dirt streaks
    for (let i = 0; i < 20000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    // Heavy concrete block seams
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, 512, 512);
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    // Corner reinforcement brackets & steel rivets
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    const rivets = [
      [20, 20], [492, 20], [20, 492], [492, 492],
      [236, 236], [276, 236], [236, 276], [276, 276],
      [256, 20], [256, 492], [20, 256], [492, 256]
    ];
    rivets.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.setupTextureQuality(texture);
    return texture;
  }

  // 4. Heavy military corrugated shipping container texture
  static createContainerTexture(colorHex: string, label = 'WARZONE // 07'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 512, 256);

    // Deep corrugation ridges (highlight & shadow)
    for (let x = 0; x < 512; x += 24) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(x, 0, 6, 256);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x + 12, 0, 6, 256);
    }

    // Heavy steel frame edge
    ctx.strokeStyle = 'rgba(10, 15, 25, 0.75)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 512, 256);

    // Military Stencil identification
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '900 24px monospace';
    ctx.fillText(label, 40, 135);

    // Hazard corner markings
    ctx.fillStyle = '#eab308';
    ctx.fillRect(10, 10, 36, 12);
    ctx.fillRect(466, 10, 36, 12);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    this.setupTextureQuality(texture);
    return texture;
  }

  // 5. Military Supply Crate Wood / Armor Texture
  static createWoodPlankTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#5c432d';
    ctx.fillRect(0, 0, 256, 256);

    // Dark grain lines
    ctx.strokeStyle = '#3e2a1b';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(30, 20, 10, 0.3)';
        ctx.fillRect(0, y + Math.random() * 26, 256, 2);
      }
    }

    // Steel brace border
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.setupTextureQuality(texture);
    return texture;
  }

  // 6. Hazard black & yellow stripes
  static createHazardStripeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let i = -128; i < 256; i += 32) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i - 16, 128);
      ctx.lineTo(i - 32, 128);
    }
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.setupTextureQuality(texture);
    return texture;
  }

  // 7. Tactical Camouflage Pattern Generator for Soldier Uniforms & Armor
  static createCamoTexture(theme: 'woodland' | 'urban' | 'desert' | 'specops'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    let palette = ['#334d28', '#1e3017', '#49603a', '#141c11'];
    if (theme === 'urban') {
      palette = ['#334155', '#1e293b', '#64748b', '#0f172a'];
    } else if (theme === 'desert') {
      palette = ['#c2a675', '#a38453', '#85663a', '#dfcaa2'];
    } else if (theme === 'specops') {
      palette = ['#18181b', '#27272a', '#09090b', '#3f3f46'];
    }

    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, 256, 256);

    // Organic camo splotches
    for (let s = 1; s < palette.length; s++) {
      ctx.fillStyle = palette[s];
      for (let i = 0; i < 28; i++) {
        const cx = Math.random() * 256;
        const cy = Math.random() * 256;
        const rx = Math.random() * 28 + 12;
        const ry = Math.random() * 20 + 8;
        const rot = Math.random() * Math.PI;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    this.setupTextureQuality(texture);
    return texture;
  }
}

