'use strict';

const DEFAULT_PARTICLE_LIMIT = 260;
const REDUCED_MOTION_PARTICLE_LIMIT = 150;
const MAX_SCORE_POPUPS = 12;

function recycleParticle(particles, index) {
    const list = particles.particle;
    const retired = list[index];
    const last = list.pop();
    if (index < list.length) list[index] = last;

    particles.pool = particles.pool || [];
    if (particles.pool.length < particles.maxParticles) particles.pool.push(retired);
}

function addParticle(particles, spec) {
    const list = particles.particle;
    particles.pool = particles.pool || [];
    particles.maxParticles = particles.maxParticles || (LocalOptions.persistence.getReduceMotion()
        ? REDUCED_MOTION_PARTICLE_LIMIT
        : DEFAULT_PARTICLE_LIMIT);

    const kind = spec.kind || 'spark';
    const priority = spec.priority === undefined
        ? (kind === 'ring' || kind === 'flash' ? 2 : (kind === 'smoke' ? 0 : 1))
        : spec.priority;

    if (list.length >= particles.maxParticles) {
        if (priority < 2) return false;

        let replaceIndex = -1;
        for (let i = 0; i < list.length; i++) {
            if (list[i].priority < priority) {
                replaceIndex = i;
                if (list[i].priority === 0) break;
            }
        }
        if (replaceIndex < 0) return false;
        recycleParticle(particles, replaceIndex);
    }

    const particle = particles.pool.pop() || {
        center: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 }
    };
    particle.kind = kind;
    particle.priority = priority;
    particle.center.x = spec.x;
    particle.center.y = spec.y;
    particle.velocity.x = spec.vx || 0;
    particle.velocity.y = spec.vy || 0;
    particle.size = spec.size || 6;
    particle.endSize = spec.endSize === undefined ? spec.size || 6 : spec.endSize;
    particle.color = spec.color || '#24e6ff';
    particle.secondaryColor = spec.secondaryColor || spec.color || '#24e6ff';
    particle.lifetime = Math.max(40, spec.lifetime || 500);
    particle.alive = 0;
    particle.drag = spec.drag === undefined ? 0.985 : spec.drag;
    particle.gravity = spec.gravity || 0;
    particle.rotation = spec.rotation || 0;
    particle.rotationSpeed = spec.rotationSpeed || 0;
    particle.length = spec.length || 0;
    particle.trail = spec.trail || 0;
    particle.twinkle = spec.twinkle || 0;
    particle.phase = spec.phase === undefined ? Math.random() * Math.PI * 2 : spec.phase;
    particle.glow = spec.glow === undefined ? 16 : spec.glow;
    particle.fadeIn = spec.fadeIn || 0;
    list.push(particle);
    return true;
}

function randomDirection(speedMin, speedMax) {
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

function addScreenShake(particles, magnitude, duration) {
    if (LocalOptions.persistence.getReduceMotion()) return;
    particles.shake = particles.shake || { magnitude: 0, time: 0, duration: 0 };
    const shake = particles.shake;
    const remaining = shake.duration > 0 ? shake.magnitude * (shake.time / shake.duration) : 0;
    if (magnitude >= remaining) {
        shake.magnitude = magnitude;
        shake.time = duration;
        shake.duration = duration;
    }
}

function createScorePopup(particles, center, points) {
    if (!points) return;
    particles.popups = particles.popups || [];
    if (particles.popups.length >= MAX_SCORE_POPUPS) particles.popups.shift();
    particles.popups.push({
        x: center.x,
        y: center.y,
        vy: -110,
        alive: 0,
        lifetime: 850,
        text: String(points),
        color: points >= 400 ? '#ffd93d' : (points >= 150 ? '#ff2fb3' : '#24e6ff')
    });
}

function createImpactParticles(particles, center, color, amount) {
    const count = amount === undefined ? 10 : amount;
    for (let i = 0; i < count; i++) {
        const velocity = randomDirection(160, 500);
        addParticle(particles, {
            kind: 'spark',
            x: center.x,
            y: center.y,
            vx: velocity.x,
            vy: velocity.y,
            size: 3 + Math.random() * 6,
            endSize: 0,
            color: i % 4 === 0 ? '#ffffff' : color,
            secondaryColor: color,
            trail: 2,
            length: 22 + Math.random() * 26,
            lifetime: 190 + Math.random() * 260,
            drag: 0.94,
            twinkle: 0.018 + Math.random() * 0.02,
            glow: 22
        });
    }
    addParticle(particles, {
        kind: 'ring', x: center.x, y: center.y, size: 8, endSize: 68,
        color, lifetime: 280, drag: 1, glow: 20, priority: 2
    });
    addParticle(particles, {
        kind: 'flash', x: center.x, y: center.y, size: 34, endSize: 4,
        color: '#ffffff', secondaryColor: color, lifetime: 130, drag: 1, glow: 32, priority: 2
    });
}

function createMuzzleParticles(fighter, particles) {
    const origin = { x: fighter.center.x, y: fighter.center.y - fighter.size.height * 0.48 };
    addParticle(particles, {
        kind: 'flash', x: origin.x, y: origin.y, size: 28, endSize: 0,
        color: '#ffffff', secondaryColor: '#24e6ff', lifetime: 110, drag: 1, glow: 28
    });
    addParticle(particles, {
        kind: 'ring', x: origin.x, y: origin.y, size: 4, endSize: 34,
        color: '#24e6ff', lifetime: 160, drag: 1, glow: 18
    });
    for (let i = 0; i < 9; i++) {
        addParticle(particles, {
            kind: 'spark',
            x: origin.x + (Math.random() - 0.5) * 18,
            y: origin.y,
            vx: (Math.random() - 0.5) * 180,
            vy: -220 - Math.random() * 320,
            size: 2.5 + Math.random() * 3.5,
            endSize: 0,
            color: i % 3 === 0 ? '#ffffff' : '#24e6ff',
            secondaryColor: '#3c65ff',
            trail: 2,
            length: 14 + Math.random() * 18,
            lifetime: 120 + Math.random() * 170,
            drag: 0.96,
            glow: 18
        });
    }
}

function createEnemyMuzzleParticles(enemy, particles) {
    const origin = { x: enemy.center.x, y: enemy.center.y + 26 };
    addParticle(particles, {
        kind: 'flash', x: origin.x, y: origin.y, size: 22, endSize: 0,
        color: '#ffffff', secondaryColor: '#ff2f55', lifetime: 100, drag: 1, glow: 24
    });
    for (let i = 0; i < 6; i++) {
        addParticle(particles, {
            kind: 'spark',
            x: origin.x + (Math.random() - 0.5) * 14,
            y: origin.y,
            vx: (Math.random() - 0.5) * 130,
            vy: 170 + Math.random() * 260,
            size: 2.5 + Math.random() * 3,
            endSize: 0,
            color: i % 3 === 0 ? '#ffffff' : '#ff2f55',
            secondaryColor: '#ff9b59',
            trail: 2,
            length: 12 + Math.random() * 14,
            lifetime: 120 + Math.random() * 150,
            drag: 0.96,
            glow: 16
        });
    }
}

function emitEngineParticles(fighter, particles, elapsedTime) {
    if (fighter.dead || fighter.lives === 0) return;
    particles.engineAccumulator = (particles.engineAccumulator || 0) + elapsedTime;
    const interval = LocalOptions.persistence.getReduceMotion() ? 46 : 22;
    while (particles.engineAccumulator >= interval) {
        particles.engineAccumulator -= interval;
        const hot = Math.random() > 0.42;
        addParticle(particles, {
            kind: 'spark',
            x: fighter.center.x + (Math.random() - 0.5) * 22,
            y: fighter.center.y + fighter.size.height * 0.42,
            vx: (Math.random() - 0.5) * 44,
            vy: 150 + Math.random() * 180,
            size: hot ? 5.5 + Math.random() * 4.5 : 3.5 + Math.random() * 3.5,
            endSize: 0,
            color: hot ? '#ffffff' : '#24e6ff',
            secondaryColor: hot ? '#24e6ff' : '#3c65ff',
            trail: 2,
            length: 16 + Math.random() * 22,
            lifetime: 180 + Math.random() * 170,
            drag: 0.975,
            twinkle: 0.02 + Math.random() * 0.02,
            glow: 22
        });
    }
}

function emitStageTransitionParticles(stats, particles) {
    if (particles.lastStageBurst === stats.stage.currentStage) return;
    particles.lastStageBurst = stats.stage.currentStage;
    const centerX = 600;
    const centerY = 800;
    const colors = ['#24e6ff', '#ff2fb3', '#ffd93d', '#ffffff'];
    const count = Math.max(20, Math.round(36 * (particles.quality || 1)));
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.08;
        const speed = 150 + Math.random() * 420;
        addParticle(particles, {
            kind: 'spark',
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2.5 + Math.random() * 5,
            endSize: 0,
            color: colors[i % colors.length],
            trail: 2,
            length: 16 + Math.random() * 24,
            lifetime: 500 + Math.random() * 650,
            drag: 0.985,
            fadeIn: Math.random() * 120,
            twinkle: 0.012 + Math.random() * 0.016,
            glow: 20
        });
    }
    addParticle(particles, { kind: 'ring', x: centerX, y: centerY, size: 20, endSize: 280, color: '#24e6ff', lifetime: 900, drag: 1, glow: 25 });
    addParticle(particles, { kind: 'ring', x: centerX, y: centerY, size: 5, endSize: 190, color: '#ff2fb3', lifetime: 680, drag: 1, glow: 22, fadeIn: 120 });
    addScreenShake(particles, 4, 240);
}

function createEnemyDeathParticles(particles, enemies, enemy) {
    const size = enemies[enemy.type].size;
    const isBoss = enemy.type === 'boss';
    const color = isBoss ? '#ff2fb3' : enemy.type === 'butterfly' ? '#ffd93d' : '#24e6ff';
    const quality = particles.quality || 1;
    const count = Math.max(isBoss ? 24 : 12, Math.round((isBoss ? 38 : 18) * quality));
    const smokeCount = Math.max(isBoss ? 6 : 2, Math.round((isBoss ? 10 : 4) * quality));

    createImpactParticles(particles, enemy.center, color, isBoss ? 12 : 7);
    for (let i = 0; i < count; i++) {
        const velocity = randomDirection(isBoss ? 140 : 110, isBoss ? 620 : 430);
        const ember = i % 3 === 0;
        addParticle(particles, {
            kind: ember ? 'ember' : 'spark',
            x: enemy.center.x + (Math.random() - 0.5) * size.width,
            y: enemy.center.y + (Math.random() - 0.5) * size.height,
            vx: velocity.x,
            vy: velocity.y,
            size: 2.5 + Math.random() * (isBoss ? 8 : 5.5),
            endSize: 0,
            color: i % 6 === 0 ? '#ffffff' : color,
            secondaryColor: '#ff8d4d',
            trail: ember ? 0 : 2,
            length: 14 + Math.random() * 26,
            lifetime: 360 + Math.random() * 720,
            gravity: ember ? 90 : 45,
            drag: 0.975,
            twinkle: ember ? 0.03 + Math.random() * 0.03 : 0.014,
            glow: 18
        });
    }
    for (let i = 0; i < smokeCount; i++) {
        const velocity = randomDirection(25, 105);
        addParticle(particles, {
            kind: 'smoke',
            x: enemy.center.x + (Math.random() - 0.5) * size.width,
            y: enemy.center.y + (Math.random() - 0.5) * size.height,
            vx: velocity.x,
            vy: velocity.y - 20,
            size: 16 + Math.random() * 24,
            endSize: 50 + Math.random() * 62,
            color: '#2b2150',
            secondaryColor: '#ff2f55',
            lifetime: 700 + Math.random() * 900,
            drag: 0.99,
            glow: 0
        });
    }
    addScreenShake(particles, isBoss ? 9 : 3.5, isBoss ? 320 : 150);
}

function createBossHitParticles(particles, enemy) {
    createImpactParticles(particles, enemy.center, '#ff2fb3', 8);
    const count = Math.max(12, Math.round(20 * (particles.quality || 1)));
    for (let i = 0; i < count; i++) {
        const velocity = randomDirection(90, 360);
        addParticle(particles, {
            kind: i % 4 === 0 ? 'ember' : 'spark',
            x: enemy.center.x + (Math.random() - 0.5) * 50,
            y: enemy.center.y + (Math.random() - 0.5) * 50,
            vx: velocity.x,
            vy: velocity.y,
            size: 2.5 + Math.random() * 5.5,
            endSize: 0,
            color: i % 3 === 0 ? '#ffd93d' : '#ff2fb3',
            trail: 1,
            length: 12 + Math.random() * 16,
            lifetime: 300 + Math.random() * 430,
            drag: 0.97,
            twinkle: 0.022 + Math.random() * 0.02,
            glow: 18
        });
    }
    addScreenShake(particles, 5, 200);
}

function createPlayerDeathParticles(fighter, particles) {
    createImpactParticles(particles, fighter.center, '#24e6ff', 14);
    const colors = ['#ffffff', '#24e6ff', '#3c65ff', '#ff2fb3'];
    const quality = particles.quality || 1;
    const debrisCount = Math.max(40, Math.round(68 * quality));
    const smokeCount = Math.max(8, Math.round(14 * quality));
    for (let i = 0; i < debrisCount; i++) {
        const velocity = randomDirection(100, 680);
        const ember = i % 4 === 0;
        addParticle(particles, {
            kind: ember ? 'ember' : 'spark',
            x: fighter.center.x + (Math.random() - 0.5) * fighter.size.width,
            y: fighter.center.y + (Math.random() - 0.5) * fighter.size.height,
            vx: velocity.x,
            vy: velocity.y,
            size: 2.5 + Math.random() * 8,
            endSize: 0,
            color: colors[i % colors.length],
            secondaryColor: '#3c65ff',
            trail: ember ? 0 : 2,
            length: 14 + Math.random() * 30,
            lifetime: 500 + Math.random() * 1000,
            gravity: ember ? 110 : 55,
            drag: 0.98,
            twinkle: ember ? 0.028 + Math.random() * 0.03 : 0.012,
            glow: 22
        });
    }
    for (let i = 0; i < smokeCount; i++) {
        const velocity = randomDirection(20, 120);
        addParticle(particles, {
            kind: 'smoke',
            x: fighter.center.x + (Math.random() - 0.5) * 70,
            y: fighter.center.y + (Math.random() - 0.5) * 70,
            vx: velocity.x,
            vy: velocity.y,
            size: 18 + Math.random() * 28,
            endSize: 66 + Math.random() * 70,
            color: '#221a44',
            secondaryColor: '#3c65ff',
            lifetime: 900 + Math.random() * 1000,
            drag: 0.993,
            glow: 0
        });
    }
    addParticle(particles, { kind: 'ring', x: fighter.center.x, y: fighter.center.y, size: 12, endSize: 240, color: '#ffffff', lifetime: 620, drag: 1, glow: 32 });
    addParticle(particles, { kind: 'ring', x: fighter.center.x, y: fighter.center.y, size: 8, endSize: 340, color: '#3c65ff', lifetime: 880, drag: 1, glow: 26, fadeIn: 100 });
    addScreenShake(particles, 16, 500);
}

function updateParticles(particles, elapsedTime) {
    const list = particles.particle;
    const step = elapsedTime / 1000;
    const frameScale = elapsedTime / 16.6667;

    particles.quality = particles.quality === undefined ? 1 : particles.quality;
    if (elapsedTime > 23) {
        particles.quality = Math.max(0.5, particles.quality - 0.08);
    } else if (elapsedTime < 18) {
        particles.quality = Math.min(1, particles.quality + 0.004);
    }

    if (particles.shake && particles.shake.time > 0) {
        particles.shake.time = Math.max(0, particles.shake.time - elapsedTime);
    }

    const popups = particles.popups;
    if (popups) {
        for (let i = popups.length - 1; i >= 0; i--) {
            const popup = popups[i];
            popup.alive += elapsedTime;
            popup.y += popup.vy * step;
            popup.vy *= Math.max(0, 1 - 1.8 * step);
            if (popup.alive >= popup.lifetime) popups.splice(i, 1);
        }
    }

    for (let i = list.length - 1; i >= 0; i--) {
        const particle = list[i];
        particle.alive += elapsedTime;
        const drag = Math.max(0, 1 - (1 - particle.drag) * frameScale);
        particle.velocity.x *= drag;
        particle.velocity.y = particle.velocity.y * drag + particle.gravity * step;
        particle.center.x += particle.velocity.x * step;
        particle.center.y += particle.velocity.y * step;
        particle.rotation += particle.rotationSpeed * step;
        if (particle.alive >= particle.lifetime) recycleParticle(particles, i);
    }
}
