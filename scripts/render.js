MyGame.graphics = (function() {
    'use strict';

    let canvas = document.getElementById('id-canvas');
    let ctx = canvas.getContext('2d');
    const orbSpriteCache = new Map();
    ctx.imageSmoothingEnabled = false;

    const ARCADE_FONT = '"Press Start 2P", "Lucida Console", Consolas, monospace';

    // Every glow particle is a circular orb: white-hot core -> color -> halo -> transparent.
    function getOrbSprite(color, secondaryColor, soft) {
        const key = (soft ? 's|' : 'o|') + color + '|' + secondaryColor;
        if (orbSpriteCache.has(key)) return orbSpriteCache.get(key);

        const sprite = document.createElement('canvas');
        sprite.width = 64;
        sprite.height = 64;
        const spriteCtx = sprite.getContext('2d');
        const gradient = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        if (soft) {
            gradient.addColorStop(0, secondaryColor);
            gradient.addColorStop(0.24, color);
            gradient.addColorStop(1, 'transparent');
        } else {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.18, color);
            gradient.addColorStop(0.52, secondaryColor);
            gradient.addColorStop(1, 'transparent');
        }
        spriteCtx.fillStyle = gradient;
        spriteCtx.beginPath();
        spriteCtx.arc(32, 32, 32, 0, Math.PI * 2);
        spriteCtx.fill();
        orbSpriteCache.set(key, sprite);
        return sprite;
    }

    function drawOrb(x, y, radius, color, secondaryColor) {
        if (radius <= 0) return;
        const sprite = getOrbSprite(color, secondaryColor || color, false);
        ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    }

    function beginShake(particles) {
        ctx.save();
        const shake = particles && particles.shake;
        if (shake && shake.time > 0 && shake.duration > 0) {
            const falloff = shake.time / shake.duration;
            const power = shake.magnitude * falloff * falloff;
            ctx.translate((Math.random() * 2 - 1) * power, (Math.random() * 2 - 1) * power);
        }
    }

    function endShake() {
        ctx.restore();
    }

    function clear() {
        const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
        background.addColorStop(0, '#0a0524');
        background.addColorStop(0.48, '#040214');
        background.addColorStop(1, '#01010a');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const glow = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.34, 10, canvas.width / 2, canvas.height * 0.34, canvas.width * 0.72);
        glow.addColorStop(0, 'rgba(84, 47, 160, 0.14)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawTexture(image, center, rotation, size) {
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(rotation);
        ctx.translate(-center.x, -center.y);
        ctx.drawImage(
            image,
            center.x - size.width / 2,
            center.y - size.height / 2,
            size.width, size.height);
        ctx.restore();
    }

    function drawText(spec) {
        ctx.save();
        ctx.font = spec.font;
        ctx.fillStyle = spec.fillStyle;
        ctx.strokeStyle = spec.strokeStyle;
        ctx.textAlign = spec.textAlign || 'left';
        ctx.textBaseline = 'top';
        if (spec.shadowColor) {
            ctx.shadowColor = spec.shadowColor;
            ctx.shadowBlur = spec.shadowBlur || 12;
        }
        ctx.translate(spec.position.x, spec.position.y);
        ctx.rotate(spec.rotation);
        ctx.translate(-spec.position.x, -spec.position.y);
        ctx.fillText(spec.text, spec.position.x, spec.position.y);
        if (spec.strokeStyle && spec.strokeStyle !== 'transparent') ctx.strokeText(spec.text, spec.position.x, spec.position.y);
        ctx.restore();
    }

    function drawBackgroundStars(backgroundStars) {
        if (!backgroundStars || !backgroundStars.stars) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < backgroundStars.stars.length; i++) {
            const star = backgroundStars.stars[i];
            const shimmer = 0.68 + Math.sin(star.phase) * 0.32;
            const alpha = Math.max(0.08, star.alpha * shimmer);

            // Comet trail made of shrinking circles instead of a line.
            if (star.trail > 1) {
                ctx.fillStyle = star.color;
                ctx.globalAlpha = alpha * 0.28;
                ctx.beginPath();
                ctx.arc(star.x, star.y - star.trail * 0.5, star.radius * 0.78, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * 0.12;
                ctx.beginPath();
                ctx.arc(star.x, star.y - star.trail, star.radius * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();

            if (star.layer === 2 && shimmer > 0.82) {
                ctx.globalAlpha = alpha * 0.4;
                drawOrb(star.x, star.y, star.radius * 3.4, star.color, star.color);
            }
        }

        const shootingStars = backgroundStars.shootingStars || [];
        for (let i = 0; i < shootingStars.length; i++) {
            const star = shootingStars[i];
            const speed = Math.hypot(star.vx, star.vy) || 1;
            const nx = star.vx / speed;
            const ny = star.vy / speed;
            const envelope = Math.sin(Math.min(1, star.alive / 180) * Math.PI / 2) * Math.max(0, 1 - star.alive / star.lifetime);
            const steps = 6;
            for (let k = steps; k >= 1; k--) {
                const f = k / steps;
                ctx.globalAlpha = envelope * (1 - f) * 0.85;
                drawOrb(star.x - nx * star.length * f, star.y - ny * star.length * f, 9 * (1 - f * 0.7), star.color, star.color);
            }
            ctx.globalAlpha = envelope;
            drawOrb(star.x, star.y, 10, '#ffffff', star.color);
        }
        ctx.restore();
    }

    function drawScore(stats) {
        const score = String(stats.score).padStart(6, '0');
        const highScore = String(Math.max(stats.highScore, stats.score)).padStart(6, '0');
        const blink = Math.floor((stats.currentTime || 0) / 460) % 2 === 0;
        if (blink) {
            drawText({ font: '24px ' + ARCADE_FONT, fillStyle: '#ff2f55', strokeStyle: 'transparent', position: { x: 48, y: 26 }, rotation: 0, text: '1UP', shadowColor: 'rgba(255,47,85,.6)', shadowBlur: 14 });
        }
        drawText({ font: '40px ' + ARCADE_FONT, fillStyle: '#ffffff', strokeStyle: 'transparent', position: { x: 48, y: 64 }, rotation: 0, text: score, shadowColor: 'rgba(36,230,255,.4)' });
        drawText({ font: '24px ' + ARCADE_FONT, fillStyle: '#ff2f55', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: 26 }, rotation: 0, text: 'HIGH SCORE', textAlign: 'center', shadowColor: 'rgba(255,47,85,.5)', shadowBlur: 12 });
        drawText({ font: '40px ' + ARCADE_FONT, fillStyle: '#ffd93d', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: 64 }, rotation: 0, text: highScore, textAlign: 'center', shadowColor: 'rgba(255,217,61,.35)' });
        drawText({ font: '24px ' + ARCADE_FONT, fillStyle: '#ff2f55', strokeStyle: 'transparent', position: { x: canvas.width - 48, y: 26 }, rotation: 0, text: 'STAGE', textAlign: 'right', shadowColor: 'rgba(255,47,85,.5)', shadowBlur: 12 });
        drawText({ font: '40px ' + ARCADE_FONT, fillStyle: '#24e6ff', strokeStyle: 'transparent', position: { x: canvas.width - 48, y: 64 }, rotation: 0, text: String(stats.stage.currentStage).padStart(2, '0'), textAlign: 'right', shadowColor: 'rgba(36,230,255,.45)' });
    }

    function showCurrentStageBeginning(stage) {
        if (stage.showStageTimer <= 0) return;
        const appear = Math.min(1, stage.stageTime / 350);
        const vanish = Math.min(1, stage.showStageTimer / 300);
        const alpha = Math.min(appear, vanish);
        if (alpha <= 0) return;
        const eased = 1 - Math.pow(1 - appear, 3);
        const scale = 1.55 - eased * 0.55;
        const pulse = 0.65 + 0.35 * Math.sin(stage.stageTime / 130);
        const text = stage.currentStage % 4 === 3
            ? 'CHALLENGING STAGE'
            : 'STAGE ' + String(stage.currentStage).padStart(2, '0');

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(canvas.width / 2, canvas.height / 2 - 40);
        ctx.scale(scale, scale);
        ctx.font = (stage.currentStage % 4 === 3 ? '46px ' : '58px ') + ARCADE_FONT;
        ctx.shadowColor = 'rgba(36,230,255,.85)';
        ctx.shadowBlur = 34 * pulse;
        ctx.fillStyle = '#24e6ff';
        ctx.fillText(text, 0, 0);
        ctx.restore();

        if (stage.stageTime > 1000 && Math.floor(stage.stageTime / 380) % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '34px ' + ARCADE_FONT;
            ctx.shadowColor = 'rgba(255,217,61,.7)';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('READY', canvas.width / 2, canvas.height / 2 + 70);
            ctx.restore();
        }
    }

    function showStats(stats) {
        if (stats.showPlayerStats && !attractMode) {
            drawText({ font: '42px ' + ARCADE_FONT, fillStyle: '#24e6ff', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: canvas.height / 2 - 50 }, rotation: 0, text: 'HITS  ' + stats.stage.hits, textAlign: 'center', shadowColor: 'rgba(36,230,255,.5)', shadowBlur: 18 });
        } else if (stats.showPlayerResults && !attractMode) {
            const ratio = stats.totalTorpedosFired > 0 ? (stats.totalHits / stats.totalTorpedosFired * 100).toFixed(1) : '0.0';
            drawText({ font: '48px ' + ARCADE_FONT, fillStyle: '#ff2fb3', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: canvas.height / 2 - 200 }, rotation: 0, text: 'RESULTS', textAlign: 'center', shadowColor: 'rgba(255,47,179,.55)', shadowBlur: 22 });
            drawText({ font: '34px ' + ARCADE_FONT, fillStyle: '#24e6ff', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: canvas.height / 2 - 76 }, rotation: 0, text: 'SHOTS ' + stats.totalTorpedosFired, textAlign: 'center', shadowColor: 'rgba(36,230,255,.4)' });
            drawText({ font: '34px ' + ARCADE_FONT, fillStyle: '#24e6ff', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: canvas.height / 2 + 4 }, rotation: 0, text: 'HITS  ' + stats.totalHits, textAlign: 'center', shadowColor: 'rgba(36,230,255,.4)' });
            drawText({ font: '34px ' + ARCADE_FONT, fillStyle: '#ffd93d', strokeStyle: 'transparent', position: { x: canvas.width / 2, y: canvas.height / 2 + 92 }, rotation: 0, text: 'RATIO ' + ratio + '%', textAlign: 'center', shadowColor: 'rgba(255,217,61,.4)' });
        }
    }

    function drawStage(stage) {
        showCurrentStageBeginning(stage);
        if (stage.currentStage < 5) {
            for (let i = 0; i < stage.currentStage; i++) {
                drawTexture(stage.badge1, { x: canvas.width - (i*32) - 16, y: canvas.height - 32}, 0, {width: 28, height: 60});
            }
        } else if (stage.currentStage < 10) {
            for (let i = 0; i < stage.currentStage-4; i++) {
                if (i === stage.currentStage-5) {
                    drawTexture(stage.badge5, { x: canvas.width - (i*32) - 16, y: canvas.height - 30}, 0, {width: 28, height: 56});
                } else {
                    drawTexture(stage.badge1, { x: canvas.width - (i*32) - 16, y: canvas.height - 26}, 0, {width: 28, height: 48});
                }
            }
        } else if (stage.currentStage < 20) {
            drawTexture(stage.badge10, { x: canvas.width - 30, y: canvas.height - 30}, 0, {width: 52, height: 56});
        } else {
            drawTexture(stage.badge20, { x: canvas.width - 34, y: canvas.height - 34}, 0, {width: 60, height: 64});
        }
    }

    function drawLives(fighter) {
        if (fighter.lives === 3) {
            drawTexture(fighter.img, { x: fighter.size.width/2 + 10, y: canvas.height - fighter.size.height/2 - 5}, 0, fighter.size);
            drawTexture(fighter.img, { x: fighter.size.width*1.5 + 15, y: canvas.height - fighter.size.height/2 - 5}, 0, fighter.size);
        } else if (fighter.lives === 2) {
            drawTexture(fighter.img, { x: fighter.size.width/2 + 10, y: canvas.height - fighter.size.height/2 - 5}, 0, fighter.size);
        }
    }

    function drawEnemy(enemies, enemy) {
        let type = enemy.type;
        if (enemies[type].images[0].isReady) {
            let rotation = 0;
            let sprite = enemy.currentSprite;
            if (enemy.path.length === 0 && !enemy.diving) {
                sprite = enemies.formationSprite;
            }
            let size = enemies[type].size;
            if (sprite === 1) {
                size = enemies[type].size2;
            }
            if (type === "boss" && enemy.life === 1) { // Needs to be after the size adjustment statement
                sprite += 2;
            }
            if (enemy.path.length > 0 && enemy.path[0].length === 3) {
                rotation = enemy.path[0][2]*Math.PI/180;
            } else if (enemy.path.length === 0 && enemy.diving) {
                rotation = 180*Math.PI/180;
            }
            if (enemy.diving && enemy.previousCenter) {
                const dx = enemy.center.x - enemy.previousCenter.x;
                const dy = enemy.center.y - enemy.previousCenter.y;
                if (Math.abs(dx) + Math.abs(dy) > 0.5) {
                    // Dive trail: chain of fading glow circles behind the ship.
                    const color = type === 'boss' ? '#ff2fb3' : '#24e6ff';
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const steps = 5;
                    for (let k = 1; k <= steps; k++) {
                        const f = k / steps;
                        ctx.globalAlpha = 0.22 * (1 - f);
                        drawOrb(
                            enemy.center.x - dx * 3.2 * f,
                            enemy.center.y - dy * 3.2 * f,
                            size.width * 0.34 * (1 - f * 0.55),
                            color, color);
                    }
                    ctx.restore();
                }
            }
            drawTexture(enemies[type].images[sprite], enemy.center, rotation, size);
        }
    }

    function drawEnemies(enemies) {
        for (let i = 0; i < enemies.enemy.length; i++) {
            drawEnemy(enemies, enemies.enemy[i]);
        }
    }

    function drawFighter(fighter) {
        if (fighter.img.isReady && !fighter.dead) {
            ctx.save();
            if (fighter.invulnerableTimer > 0 && fighter.lives > 0) {
                // Classic respawn blink.
                ctx.globalAlpha = 0.35 + 0.32 * (1 + Math.sin(fighter.invulnerableTimer * 0.045));
            }
            drawTexture(fighter.img, fighter.center, 0, fighter.size);
            ctx.restore();
        }
    }

    function drawTorpedos(torpedos) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (torpedos.img1.isReady) {
            for (let i = 0; i < torpedos.friendly.length; i++) {
                const t = torpedos.friendly[i];
                // Trail behind the torpedo drawn as fading circles.
                const steps = 5;
                for (let k = 1; k <= steps; k++) {
                    const f = k / steps;
                    ctx.globalAlpha = 0.5 * (1 - f) * (0.86 + Math.random() * 0.14);
                    drawOrb(t.center.x, t.center.y + 14 + 78 * f, 10 * (1 - f * 0.62), '#24e6ff', '#3c65ff');
                }
                ctx.globalAlpha = 0.75;
                drawOrb(t.center.x, t.center.y - 10, 8, '#ffffff', '#24e6ff');
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                drawTexture(torpedos.img1, t.center, 0, torpedos.size);
                ctx.globalCompositeOperation = 'lighter';
            }
        }
        if (torpedos.img2.isReady) {
            const size = { width: torpedos.size.width * 1.2, height: torpedos.size.height * 1.2 };
            for (let i = 0; i < torpedos.enemy.length; i++) {
                const t = torpedos.enemy[i];
                const steps = 4;
                for (let k = 1; k <= steps; k++) {
                    const f = k / steps;
                    ctx.globalAlpha = 0.45 * (1 - f) * (0.86 + Math.random() * 0.14);
                    drawOrb(t.center.x, t.center.y - 14 - 60 * f, 9 * (1 - f * 0.6), '#ff2f55', '#ff9b59');
                }
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                drawTexture(torpedos.img2, t.center, 180*Math.PI/180, size);
                ctx.globalCompositeOperation = 'lighter';
            }
        }
        ctx.restore();
    }

    function drawParticles(particles) {
        const list = particles.particle;
        ctx.save();

        // Smoke first: soft dark circles, normal blending.
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (p.kind !== 'smoke') continue;
            const progress = Math.max(0, Math.min(1, p.alive / p.lifetime));
            const fadeIn = p.fadeIn > 0 ? Math.min(1, p.alive / p.fadeIn) : 1;
            const alpha = Math.pow(1 - progress, 1.6) * fadeIn;
            const size = p.size + (p.endSize - p.size) * progress;
            if (alpha <= 0 || size <= 0) continue;
            const sprite = getOrbSprite(p.color, p.secondaryColor, true);
            ctx.globalAlpha = alpha * 0.34;
            ctx.drawImage(sprite, p.center.x - size, p.center.y - size, size * 2, size * 2);
        }

        // Everything else: additive glowing circles.
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (p.kind === 'smoke') continue;
            const progress = Math.max(0, Math.min(1, p.alive / p.lifetime));
            const fadeIn = p.fadeIn > 0 ? Math.min(1, p.alive / p.fadeIn) : 1;
            let alpha = Math.pow(1 - progress, 0.82) * fadeIn;
            if (p.twinkle > 0) alpha *= 0.68 + 0.32 * Math.sin(p.alive * p.twinkle + p.phase);
            const size = p.size + (p.endSize - p.size) * progress;
            if (alpha <= 0 || size <= 0) continue;

            if (p.kind === 'ring') {
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = Math.max(1.5, 7 * (1 - progress));
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.glow;
                ctx.beginPath();
                ctx.arc(p.center.x, p.center.y, size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                continue;
            }

            // Circle-chain tail for moving sparks.
            if (p.trail > 0) {
                const speed = Math.hypot(p.velocity.x, p.velocity.y);
                if (speed > 6) {
                    const nx = p.velocity.x / speed;
                    const ny = p.velocity.y / speed;
                    const tail = p.length || size * 3;
                    for (let k = 1; k <= p.trail; k++) {
                        const f = k / (p.trail + 1);
                        ctx.globalAlpha = alpha * (1 - f) * 0.5;
                        drawOrb(p.center.x - nx * tail * f, p.center.y - ny * tail * f, size * (1 - f * 0.55), p.color, p.secondaryColor);
                    }
                }
            }

            ctx.globalAlpha = alpha;
            drawOrb(p.center.x, p.center.y, size, p.color, p.secondaryColor);
        }
        ctx.restore();

        drawScorePopups(particles);
    }

    function drawScorePopups(particles) {
        const popups = particles.popups;
        if (!popups || popups.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < popups.length; i++) {
            const popup = popups[i];
            const t = popup.alive / popup.lifetime;
            const popScale = popup.alive < 120 ? 1.65 - 0.65 * (popup.alive / 120) : 1;
            const alpha = t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
            ctx.globalAlpha = alpha;
            ctx.font = Math.round(30 * popScale) + 'px ' + ARCADE_FONT;
            ctx.shadowColor = popup.color;
            ctx.shadowBlur = 16;
            ctx.fillStyle = popup.color;
            ctx.fillText(popup.text, popup.x, popup.y);
        }
        ctx.restore();
    }

    let api = {
        get canvas() { return canvas; },
        clear: clear,
        beginShake: beginShake,
        endShake: endShake,
        drawTexture: drawTexture,
        drawText: drawText,
        drawBackgroundStars: drawBackgroundStars,
        drawScore: drawScore,
        drawStage: drawStage,
        drawLives: drawLives,
        drawEnemies: drawEnemies,
        drawFighter: drawFighter,
        drawTorpedos: drawTorpedos,
        drawParticles: drawParticles,
        showStats: showStats,
    };

    return api;
}());
