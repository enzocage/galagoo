"use strict";

function playSound(audio) {
    if (!audio) return;
    const result = audio.play();
    if (result && typeof result.catch === 'function') result.catch(function() {});
}


function updateTime(elapsedTime, stats, fighter) {
    stats.currentTime += elapsedTime;
    stats.stage.stageTime += elapsedTime;
    stats.stage.showStageTimer -= elapsedTime;

    if (fighter.invulnerableTimer > 0) {
        fighter.invulnerableTimer -= elapsedTime;
    } else if (fighter.dead) {
        fighter.deadTimer -= elapsedTime;
        if (fighter.deadTimer < 0 && fighter.lives > 0) {
            fighter.invulnerableTimer = 1000;
            fighter.dead = false;
        }
    }
    if (stats.showPlayerResults === true) {
        stats.endGameTimer -= elapsedTime;
    }
}

function createParallaxStar(layer, canvas, randomizeY) {
    const layerSpecs = [
        { speed: 28, radius: [0.6, 1.4], alpha: [0.24, 0.56], trail: [0, 2] },
        { speed: 76, radius: [1.0, 2.2], alpha: [0.42, 0.78], trail: [2, 8] },
        { speed: 178, radius: [1.4, 3.4], alpha: [0.6, 1], trail: [8, 24] }
    ];
    const spec = layerSpecs[layer];
    const range = (values) => values[0] + Math.random() * (values[1] - values[0]);
    const palette = layer === 0 ? ['#7f9fc3', '#9cc7e8', '#ffffff'] : ['#ffffff', '#70efff', '#b6c8ff', '#ff9bd0'];
    return {
        x: Math.random() * canvas.width,
        y: randomizeY ? Math.random() * canvas.height : -30,
        layer,
        speed: spec.speed * (0.76 + Math.random() * 0.5),
        radius: range(spec.radius),
        alpha: range(spec.alpha),
        trail: range(spec.trail),
        drift: (Math.random() - 0.5) * (layer + 1) * 7,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.001 + Math.random() * 0.003,
        color: palette[Math.floor(Math.random() * palette.length)]
    };
}

function initializeParallaxStars(backgroundStars, canvas) {
    const counts = [92, 48, 23];
    backgroundStars.stars = [];
    backgroundStars.shootingStars = [];
    backgroundStars.elapsed = 0;
    for (let layer = 0; layer < counts.length; layer++) {
        for (let i = 0; i < counts[layer]; i++) backgroundStars.stars.push(createParallaxStar(layer, canvas, true));
    }
    backgroundStars.initialized = true;
}

function updateBackgroundStars(elapsedTime, backgroundStars) {
    const canvas = document.getElementById('id-canvas');
    if (!backgroundStars.initialized) initializeParallaxStars(backgroundStars, canvas);
    const reducedMotion = LocalOptions.persistence.getReduceMotion();
    const motionScale = reducedMotion ? 0.32 : 1;
    const step = elapsedTime / 1000;
    backgroundStars.elapsed += elapsedTime;

    for (let i = 0; i < backgroundStars.stars.length; i++) {
        const star = backgroundStars.stars[i];
        star.y += star.speed * motionScale * step;
        star.x += star.drift * motionScale * step;
        star.phase += elapsedTime * star.twinkleSpeed;
        if (star.y > canvas.height + star.trail + 6) {
            const replacement = createParallaxStar(star.layer, canvas, false);
            backgroundStars.stars[i] = replacement;
        } else if (star.x < -10) {
            star.x = canvas.width + 10;
        } else if (star.x > canvas.width + 10) {
            star.x = -10;
        }
    }

    if (!reducedMotion && backgroundStars.shootingStars.length < 3 && Math.random() < elapsedTime / 6500) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        backgroundStars.shootingStars.push({
            x: direction > 0 ? Math.random() * canvas.width * 0.7 : canvas.width * 0.3 + Math.random() * canvas.width * 0.7,
            y: -80,
            vx: direction * (160 + Math.random() * 180),
            vy: 760 + Math.random() * 420,
            length: 90 + Math.random() * 150,
            lifetime: 1000 + Math.random() * 500,
            alive: 0,
            color: Math.random() > 0.35 ? '#70efff' : '#ff9bd0'
        });
    }

    for (let i = backgroundStars.shootingStars.length - 1; i >= 0; i--) {
        const star = backgroundStars.shootingStars[i];
        star.alive += elapsedTime;
        star.x += star.vx * step;
        star.y += star.vy * step;
        if (star.alive >= star.lifetime || star.y > canvas.height + star.length) backgroundStars.shootingStars.splice(i, 1);
    }
}

function spawnEnemies(stats, enemies) {
    let stageEnemies = stats.stage.stageEnemies;
    if (stageEnemies.length > 0) {
        let remove = [];
        for (let i = 0; i < stageEnemies.length; i++) {
            if (stageEnemies[i].time < stats.stage.stageTime) {
                for (let j = 0; j < stageEnemies[i].enemy.length; j++) {
                    enemies.enemy.push(stageEnemies[i].enemy[j]);
                }
                remove.push(i);
            }
        }
        for (let i = remove.length-1; i > -1; i--) {
            stageEnemies.splice(remove[i], 1);
        }
    }
}

function updateEnemy(elapsedTime, enemy, stats, enemies, torpedos, fighter, particles) {
    enemy.previousCenter = { x: enemy.center.x, y: enemy.center.y };

    // Update current sprite
    if (enemy.path.length !== 0 && (enemy.type === "bee" || enemy.type === "butterfly" || enemy.type === "boss")) {
        enemy.spriteCount -= elapsedTime;
        if (enemy.spriteCount < 0) {
            if (enemy.currentSprite === 0) {
                enemy.currentSprite = 1;
            } else if (enemy.currentSprite === 1) {
                enemy.currentSprite = 0;
            }
            enemy.spriteCount = 400;
        }
    } else if (enemy.path.length === 0 && !enemy.diving) {
        enemy.currentSprite = enemies.formationSprite;
    }

    // Fire torpedo
    if (enemy.fireTimer > 0) {
        enemy.fireTimer -= elapsedTime;
        if (enemy.fireTimer <= 0) {
            fireEnemyTorpedo(enemy, torpedos, fighter, elapsedTime, particles);
        } 
    }

    // Update path
    if (enemy.path.length !== 0) {
        let speed = elapsedTime * (1+(stats.stage.currentStage/30));
        if (enemy.diving) {
            speed /= 2;
        }
        while (enemy.path.length !== 0 && speed !== 0) {
            let d = distance(enemy.center.x, enemy.center.y, enemy.path[0][0], enemy.path[0][1]);
            if (speed < d) {
                enemy.center = pointAtDistance(enemy.center.x, enemy.center.y, enemy.path[0][0], enemy.path[0][1], speed);
                speed = 0;
            } else {
                enemy.center = { x: enemy.path[0][0], y: enemy.path[0][1]}
                enemy.path.splice(0, 1);
                speed -= d;
            }
        }
        if (enemy.path.length === 1 && !enemy.diving) {
            enemy.path.push([enemy.formationLocation[0] + enemies.formationOffsetX, enemy.formationLocation[1]])
        }
    } else if (enemy.path.length === 0 && enemy.diving) {
        enemy.path = getDivePath(enemy);
    }

    // Update formation location
    else if (enemies.formationLeftRight > 0) {
        enemy.center.x = enemy.formationLocation[0] + enemies.formationOffsetX;
    } else if (enemies.formationLeftRight === 0) {
        let diffX = enemy.formationLocation[0] - 600;
        enemy.center.x = diffX*enemies.formationOffsetBreath + 600;
        let diffY = enemy.formationLocation[1] - 200;
        enemy.center.y = diffY*enemies.formationOffsetBreath + 200;
    }
}

function updateEnemyFormation(elapsedTime, enemies) {
    // Update the sprite for the whole formation.
    enemies.formationSpriteCount -= elapsedTime;
    if (enemies.formationSpriteCount < 0) {
        if (enemies.formationSprite === 0) {
            enemies.formationSprite = 1;
        } else if (enemies.formationSprite === 1) {
            enemies.formationSprite = 0;
        }
        enemies.formationSpriteCount = 500;
    }
    // Update the formation locations
    let speed = elapsedTime / 30;
    if (enemies.formationLeftRight > 0) {
        if (enemies.formationLeftRight % 2 === 0) {
            enemies.formationOffsetX += speed;
        } else {
            enemies.formationOffsetX -= speed;
        }
        if (enemies.formationOffsetX > 100) {
            enemies.formationOffsetX = 100;
            enemies.formationLeftRight -= 1;
        } else if (enemies.formationOffsetX < -100) {
            enemies.formationOffsetX = -100;
            enemies.formationLeftRight -= 1;
        } else if (enemies.formationLeftRight === 1 && enemies.formationOffsetX < 0) {
            enemies.formationOffsetX = 0;
            enemies.formationLeftRight = 0;
        }
    } else if (enemies.formationLeftRight === 0) {
        if (enemies.formationBreathOut) {
            enemies.formationOffsetBreath += speed/250;
            if (enemies.formationOffsetBreath > 1.2) {
                enemies.formationBreathOut = false;
            }
        } else {
            enemies.formationOffsetBreath -= speed/250;
            if (enemies.formationOffsetBreath < 1) {
                enemies.formationBreathOut = true;
            }
        }
    }
}

function updateEnemies(elapsedTime, enemies, stats, torpedos, fighter, sound, particles) {
    updateEnemyFormation(elapsedTime, enemies)
    spawnEnemies(stats, enemies);
    for (let i = 0; i < enemies.enemy.length; i++ ) {
        updateEnemy(elapsedTime, enemies.enemy[i], stats, enemies, torpedos, fighter, particles);
    }
    enemyDiving(elapsedTime, enemies, stats, sound);
}

function enemyDiving(elapsedTime, enemies, stats, sound) {
    if (stats.stage.currentStage % 4 !== 3) { // Don't dive during the challenging stages
        enemies.divingTimer -= elapsedTime;
    }
    if (enemies.divingTimer < 0) {
        let availableEnemies = [];
        for (let i = 0; i < enemies.enemy.length; i++) {
            let enemy = enemies.enemy[i];
            if (!enemy.diving && enemy.path.length === 0) {
                availableEnemies.push(enemy);
            }
        }
        if (availableEnemies.length > 1) {
            let a = getRandomInt(0, availableEnemies.length);
            let b = getRandomInt(0, availableEnemies.length);
            availableEnemies[a].path = getDivePath(availableEnemies[a]);
            availableEnemies[b].path = getDivePath(availableEnemies[b]);
            availableEnemies[a].fireTimer = 1000;
            availableEnemies[b].fireTimer = 1000;
            if (sound.diving.isReady && !attractMode) {
                playSound(sound.diving);
            }
        } else if (availableEnemies.length === 1) {
            availableEnemies[0].path = getDivePath(availableEnemies[0]);
            availableEnemies[0].fireTimer = 1000;
            if (sound.diving.isReady && !attractMode) {
                playSound(sound.diving);
            }
        }
        enemies.divingTimer = 3000;
    }
}

function updateTorpedos(elapsedTime, torpedos) {
    let canvas = document.getElementById('id-canvas');
    let speed = elapsedTime / 800 * canvas.height;

    let removeFriendly = [];
    for (let i = 0; i < torpedos.friendly.length; i++) {
        let t = torpedos.friendly[i];
        t.center.y -= speed;
        if (t.center.y < 0) {
            removeFriendly.push(i);
        }
    }
    for (let i = removeFriendly.length-1; i > -1; i--) {
        torpedos.friendly.splice(removeFriendly[i], 1);
    }

    let removeEnemy = [];
    for (let i = 0; i < torpedos.enemy.length; i++) {
        let t = torpedos.enemy[i];
        t.center.y += speed*2/5;
        t.center.x += t.xVel;
        if (t.center.y > canvas.height) {
            removeEnemy.push(i);
        }
    }
    for (let i = removeEnemy.length-1; i > -1; i--) {
        torpedos.enemy.splice(removeEnemy[i], 1);
    }
}

function fireEnemyTorpedo(enemy, torpedos, fighter, elapsedTime, particles) {
    let canvas = document.getElementById("id-canvas");
    let xVel = 0;
    if (fighter.center.x < enemy.center.x) {
        xVel = -1 * elapsedTime / 800 / 15 * canvas.height;
    } else {
        xVel = elapsedTime / 800 / 15 * canvas.height;
    }
    torpedos.enemy.push({ center: {x: enemy.center.x, y: enemy.center.y}, xVel: xVel});
    if (particles) createEnemyMuzzleParticles(enemy, particles);
}

function fireTorpedo(fighter, torpedos, stats, sound, particles) {
    if (!fighter.dead  && (torpedos.noLimit  || torpedos.friendly.length < 2)) {
        torpedos.friendly.push({ center: {x: fighter.center.x, y: fighter.center.y} });
        stats.stage.torpedosFired++;
        if (particles) createMuzzleParticles(fighter, particles);
        if (sound.fireTorpedo[sound.fireTorpedoQueue].isReady && !attractMode) {
            playSound(sound.fireTorpedo[sound.fireTorpedoQueue]);
            sound.fireTorpedoQueue++;
            if (sound.fireTorpedoQueue > 9) {
                sound.fireTorpedoQueue = 0;
            }
        }
    }
}

function moveFighterLeft(fighter, value) {
    fighter.center.x -= 8 * value;
    if (fighter.center.x < fighter.size.width/2) {
        fighter.center.x = fighter.size.width/2;
    }
}

function moveFighterRight(fighter, value) {
    let canvas = document.getElementById('id-canvas');
    fighter.center.x += 8 * value;
    if (fighter.center.x + fighter.size.width/2 > canvas.width) {
        fighter.center.x = canvas.width - fighter.size.width/2;
    }
}

function checkCollisions(torpedos, fighter, enemies, stats, particles, sound) {
    if (fighter.invulnerableTimer <= 0 && !fighter.dead) {
        checkFighterCollision(torpedos, fighter, enemies, particles, sound);
    }
    checkEnemyCollision(torpedos, enemies, stats, particles, sound);
}

function checkFighterCollision(torpedos, fighter, enemies, particles, sound) {
    let enemyTorpedos = torpedos.enemy;
    let removeTorpedo = [];
    for (let i = 0; i < enemyTorpedos.length; i++) {
        let t = enemyTorpedos[i];
        let f = fighter;
        if (t.center.x < f.center.x+f.size.width/2 && t.center.x > f.center.x-f.size.width/2 && 
            t.center.y+torpedos.size.height/2 < f.center.y+f.size.height/2 && t.center.y+torpedos.size.height/2 > f.center.y-f.size.height/2+20) {
            if (!removeTorpedo.includes(i)) {
                removeTorpedo.push(i);
            }
            createPlayerDeathParticles(fighter, particles);
            loseLife(fighter);
            if (sound.playerDeath.isReady && !attractMode) {
                playSound(sound.playerDeath);
            }
        }
    }
    for (let i = removeTorpedo.length-1; i > -1; i--) {
        enemyTorpedos.splice(removeTorpedo[i], 1);
    }

    // Check for collision with an enemy.
    let removeEnemy = [];
    for (let i = 0; i < enemies.enemy.length; i++) {
        let e = enemies.enemy[i];
        if (e.center.x < fighter.center.x+fighter.size.width/2+20 && e.center.x > fighter.center.x-fighter.size.width/2-20 &&
            e.center.y < fighter.center.y+fighter.size.height/2+30 && e.center.y > fighter.center.y-fighter.size.height/2) {
            createPlayerDeathParticles(fighter, particles);
            loseLife(fighter);
            createEnemyDeathParticles(particles, enemies, e);
            if (sound.playerDeath.isReady && !attractMode) {
                playSound(sound.playerDeath);
            }
            removeEnemy.push(i);
        }
    }
    for (let i = removeEnemy.length-1; i > -1; i--) {
        enemies.enemy.splice(removeEnemy[i], 1);
    }
}

function checkEnemyCollision(torpedos, enemies, stats, particles, sound) {
    let friendlyTorpedos = torpedos.friendly;
    let removeTorpedo = [];
    let removeEnemy = [];
    for (let i = 0; i < friendlyTorpedos.length; i++) {
        let t = friendlyTorpedos[i];
        for (let j = 0; j < enemies.enemy.length; j++) {
            let e = enemies.enemy[j];
            if (t.center.x < e.center.x+enemies[e.type].size.width/2+6 && t.center.x > e.center.x-enemies[e.type].size.width/2-6 && 
                t.center.y-torpedos.size.height/2 < e.center.y+enemies[e.type].size.height/2 && t.center.y-torpedos.size.height/2 > e.center.y-enemies[e.type].size.height/2) {
                // Resolve a hit.
                if (!removeTorpedo.includes(i)) {
                    removeTorpedo.push(i);
                }
                if (!removeEnemy.includes(j)) {
                    if (e.type === "boss" && e.life === 2) {
                        e.life--;
                        createBossHitParticles(particles, e);
                        if (sound.bossHurt.isReady && !attractMode) {
                            playSound(sound.bossHurt);
                        }
                    } else {
                        removeEnemy.push(j);
                        const points = addScore(stats, e);
                        createScorePopup(particles, e.center, points);
                        createEnemyDeathParticles(particles, enemies, e);
                        if (e.type === "boss" && sound.bossDeath.isReady && !attractMode) {
                            playSound(sound.bossDeath);
                        } else if (sound.enemyDeath.isReady && !attractMode) {
                            playSound(sound.enemyDeath);
                        }
                    }
                }
                stats.stage.hits++;
                break;
            }
        }
    }
    for (let i = removeTorpedo.length-1; i > -1; i--) {
        friendlyTorpedos.splice(removeTorpedo[i], 1);
    }
    for (let i = removeEnemy.length-1; i > -1; i--) {
        enemies.enemy.splice(removeEnemy[i], 1);
    }
}

function loseLife(fighter) {
    fighter.lives--;
    fighter.dead = true;
    fighter.deadTimer = 2000;
}

function addScore(stats, enemy) {
    let points = 0;
    if (enemy.type === "bee" && !enemy.diving) {
        points = 50;
    } else if (enemy.type === "bee" && enemy.diving) {
        points = 100;
    } else if (enemy.type === "butterfly" && !enemy.diving) {
        points = 80;
    } else if (enemy.type === "butterfly" && enemy.diving) {
        points = 160;
    } else if (enemy.type === "bonus1" || enemy.type === "bonus2" || enemy.type === "bonus3") {
        points = 100;
    } else if (enemy.type === "boss" && !enemy.diving) {
        points = 150;
    } else if (enemy.type === "boss" && enemy.diving) {
        points = 400; // Diving along 400, diving with 1 escort 800, diving with 2 escorts 1600
    }
    stats.score += points;
    return points;
    // 1 group of enemies in 1st and 2nd Challenging Stages 	1000
    // 1 group of enemies in 3rd and 4th Challenging Stages 	1500
    // 1 group of enemies in 5th and 6th Challenging Stages 	2000
    // 1 group of enemies in 7th and subsequent Challenging Stages 	3000
}

function checkEndStage(enemies, stats, fighter, elapsedTime, sound) {
    if (fighter.lives === 0 && fighter.deadTimer <= 0 && !stats.showPlayerResults) {
        stats.totalTorpedosFired += stats.stage.torpedosFired;
        stats.totalHits += stats.stage.hits;
        stats.showPlayerResults = true;
    }

    // Load the next stage.
    else if (stats.stage.stageEnemies.length === 0 && enemies.enemy.length === 0 && fighter.lives > 0) {
        if (!stats.stage.endStage) {
            if (stats.stage.currentStage % 4 === 3) {
                stats.stage.endStageTimer = 2000;
                stats.showPlayerStats = true;
            } else {
                stats.stage.endStageTimer = 500;
            }
            stats.totalTorpedosFired += stats.stage.torpedosFired;
            stats.totalHits += stats.stage.hits;
            stats.stage.endStage = true;
        } else {
            stats.stage.endStageTimer -= elapsedTime;
            if (stats.stage.endStageTimer < 0) { // Load new stage and reset the stage variables.
                stats.showPlayerStats = false;
                stats.stage.endStage = false;
                stats.stage.currentStage += 1;
                stats.stage.showStageTimer = 2000;
                stats.stage.torpedosFired = 0;
                stats.stage.hits = 0;
                stats.stage.stageTime = 0;
                stats.stage.stageEnemies = getStage(stats.stage.currentStage);
                enemies.divingTimer = 15000;
                enemies.formationSpriteCount = 500;
                enemies.formationLeftRight = 4;
                enemies.formationOffsetX = 0;
                enemies.formationOffsetBreath = 1;
                enemies.formationBreathOut = true;
                if (sound.levelStart.isReady && !attractMode) {
                    playSound(sound.levelStart);
                }
            }
        }
    } else if (stats.stage.currentStage % 4 === 3 && stats.stage.stageTime > 17000) {
        enemies.enemy = [];
    }
}

function updateAI(elapsedTime, ai, fighter, enemies, torpedos, stats, sound, particles) {
    let moveSpeed = elapsedTime / 2;

    ai.fireTimer -= elapsedTime;
    if (ai.fireTimer < 0 && enemies.enemy.length !== 0) {
        ai.fireTimer = 200;
        fireTorpedo(fighter, torpedos, stats, sound, particles);
    }

    if (enemies.enemy.length !== 0) {
        let e = enemies.enemy[0];
        if (e.center.x < fighter.center.x) {
            fighter.center.x -= moveSpeed;
        } else if (e.center.x > fighter.center.x) {
            fighter.center.x += moveSpeed;
        }
    }
}

function mobileSupport(fighter, torpedos, stats, sound, particles) {
    const slider = document.getElementById('mobile-movement');
    const fireButton = document.getElementById('mobile-fire');

    function updateMovement() {
        fighter.mobileMoveVal = Number(slider.value);
    }

    function resetMovement() {
        slider.value = 50;
        fighter.mobileMoveVal = 50;
    }

    slider.addEventListener('input', updateMovement);
    slider.addEventListener('change', resetMovement);
    slider.addEventListener('pointerup', resetMovement);
    slider.addEventListener('pointercancel', resetMovement);
    slider.addEventListener('lostpointercapture', resetMovement);

    fireButton.addEventListener('pointerdown', function(event) {
        event.preventDefault();
        if (stats.currentTime > 0 && MyGame.game.getActiveScreen() === 'game-play') {
            fireTorpedo(fighter, torpedos, stats, sound, particles);
        }
    });

    // The red FIRE button on the cabinet control deck works too.
    const deckFire = document.getElementById('deck-fire');
    if (deckFire) {
        deckFire.addEventListener('pointerdown', function(event) {
            event.preventDefault();
            if (stats.currentTime > 0 && MyGame.game.getActiveScreen() === 'game-play' && !attractMode) {
                fireTorpedo(fighter, torpedos, stats, sound, particles);
            }
        });
    }
}

function updateFighterMobile(elapsedTime, fighter) {
    if (fighter.mobileMoveVal < 50) {
        moveFighterLeft(fighter, (1-(fighter.mobileMoveVal/50))*elapsedTime/6);
    } else if (fighter.mobileMoveVal > 50) {
        moveFighterRight(fighter, ((fighter.mobileMoveVal-50)/50)*elapsedTime/6)
    }
}
