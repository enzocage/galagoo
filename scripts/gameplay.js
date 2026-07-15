MyGame.screens['game-play'] = (function(game, input, graphics, images, sounds) {
    'use strict';

    const canvas = document.getElementById('id-canvas');
    const pauseOverlay = document.getElementById('pause-overlay');
    const myKeyboard = input.Keyboard();
    let lastTimeStamp = performance.now();
    let cancelNextRequest = true;
    let quit = false;
    let paused = false;
    let backgroundStars = {};
    let fighter = {};
    let enemies = {};
    let torpedos = {};
    let stats = {};
    let particles = {};
    let sound = {};
    let ai = {};

    function processInput(elapsedTime) {
        myKeyboard.update(elapsedTime);
    }

    function update(elapsedTime) {
        updateTime(elapsedTime, stats, fighter);
        updateBackgroundStars(elapsedTime, backgroundStars);
        if (fighter.lives !== 0) {
            updateEnemies(elapsedTime, enemies, stats, torpedos, fighter, sound, particles);
            updateTorpedos(elapsedTime, torpedos);
            updateFighterMobile(elapsedTime, fighter);
            emitEngineParticles(fighter, particles, elapsedTime);
        }
        emitStageTransitionParticles(stats, particles);
        if (attractMode) {
            updateAI(elapsedTime, ai, fighter, enemies, torpedos, stats, sound, particles);
            if (stats.stage.currentStage === 3) endGame();
        }
        checkCollisions(torpedos, fighter, enemies, stats, particles, sound);
        updateParticles(particles, elapsedTime);
        checkEndStage(enemies, stats, fighter, elapsedTime, sound);
        if (fighter.lives === 0 && stats.endGameTimer <= 0) endGame();
        if (MyGame.ui && MyGame.ui.updateStats) MyGame.ui.updateStats(stats);
    }

    function render() {
        graphics.clear();
        graphics.beginShake(particles);
        graphics.drawBackgroundStars(backgroundStars);
        graphics.drawScore(stats);
        graphics.drawLives(fighter);
        graphics.drawStage(stats.stage);
        graphics.drawEnemies(enemies);
        graphics.drawFighter(fighter);
        graphics.drawTorpedos(torpedos);
        graphics.drawParticles(particles);
        graphics.showStats(stats);
        graphics.endShake();
    }

    function gameLoop(time) {
        const elapsedTime = Math.min(50, Math.max(0, time - lastTimeStamp));
        lastTimeStamp = time;

        processInput(elapsedTime);
        if (!paused) update(elapsedTime);
        render();

        if (!cancelNextRequest) requestAnimationFrame(gameLoop);
    }

    function initialize() {
        backgroundStars = { stars: [] };
        fighter = {
            lives: 3,
            img: images.loadFighter(),
            center: { x: 600, y: 1470 },
            size: { width: 80, height: 80 },
            dead: false,
            deadTimer: 0,
            invulnerableTimer: 1000,
            mobileMoveVal: 50
        };
        torpedos = {
            friendly: [],
            enemy: [],
            img1: images.loadTorpedo1(),
            img2: images.loadTorpedo2(),
            size: { width: 15, height: 40 },
            noLimit: true
        };
        stats = {
            score: 0,
            totalTorpedosFired: 0,
            totalHits: 0,
            currentTime: 0,
            showPlayerStats: false,
            showPlayerResults: false,
            endGameTimer: 5000,
            highScore: LocalScores.persistence.getHighScore()
        };
        stats.stage = {
            currentStage: 1,
            stageTime: 0,
            showStageTimer: 5000,
            torpedosFired: 0,
            hits: 0,
            endingStage: false,
            endingStageTimer: 500,
            stageEnemies: getStage(1),
            badge1: images.loadBadge1(),
            badge5: images.loadBadge5(),
            badge10: images.loadBadge10(),
            badge20: images.loadBadge20(),
            badge30: images.loadBadge30(),
            badge50: images.loadBadge50()
        };
        enemies = {
            enemy: [], divingTimer: 17000,
            formationSprite: 0, formationSpriteCount: 500, formationLeftRight: 4,
            formationOffsetX: 0, formationOffsetBreath: 1, formationBreathOut: true,
            bee: { size: { width: 54, height: 60 }, size2: { width: 78, height: 60 }, images: [images.loadBee1(), images.loadBee2()] },
            butterfly: { size: { width: 54, height: 60 }, size2: { width: 78, height: 60 }, images: [images.loadButterfly1(), images.loadButterfly2()] },
            boss: { size: { width: 90, height: 90 }, size2: { width: 90, height: 96 }, images: [images.loadFullBoss1(), images.loadFullBoss2(), images.loadHalfBoss1(), images.loadHalfBoss2()] },
            bonus1: { size: { width: 96, height: 78 }, size2: { width: 78, height: 60 }, images: [images.loadBonus1()] },
            bonus2: { size: { width: 108, height: 90 }, size2: { width: 78, height: 60 }, images: [images.loadBonus2()] },
            bonus3: { size: { width: 84, height: 96 }, size2: { width: 78, height: 60 }, images: [images.loadBonus3()] }
        };
        particles = {
            particle: [],
            pool: [],
            popups: [],
            shake: { magnitude: 0, time: 0, duration: 0 },
            maxParticles: LocalOptions.persistence.getReduceMotion() ? 150 : 260,
            quality: 1,
            engineAccumulator: 0,
            lastStageBurst: 0
        };
        sound = {
            theme: sounds.loadTheme(),
            music: sounds.loadMusic(),
            voice: sounds.loadVoice(),
            musicPhase: false,
            diving: sounds.loadDiving(),
            enemyDeath: sounds.loadEnemyDeath(),
            levelStart: sounds.loadLevel(),
            playerDeath: sounds.loadPlayerDeath(),
            bossHurt: sounds.loadBossHurt(),
            bossDeath: sounds.loadBossDeath(),
            fireTorpedo: [],
            fireTorpedoQueue: 0
        };
        for (let i = 0; i < 10; i++) sound.fireTorpedo.push(sounds.loadTorpedo());
        ai = { fireTimer: 5000 };

        // Once the original start theme finishes, both soundtrack layers start together.
        sound.music.loop = true;
        sound.voice.loop = true;
        sound.theme.addEventListener('ended', function() {
            if (attractMode || quit || game.getActiveScreen() !== 'game-play' || fighter.lives === 0) return;
            sound.musicPhase = true;
            if (!paused) {
                sound.music.currentTime = 0;
                sound.voice.currentTime = 0;
                playSound(sound.music);
                playSound(sound.voice);
            }
        });

        canvas.addEventListener('pointerdown', function(event) {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (!paused && !attractMode && stats.currentTime > 0) fireTorpedo(fighter, torpedos, stats, sound, particles);
        });
        document.getElementById('id-resume-game').addEventListener('click', resume);
        document.getElementById('id-exit-game').addEventListener('click', exitToMenu);
        document.addEventListener('visibilitychange', function() {
            if (document.hidden && game.getActiveScreen() === 'game-play' && !attractMode) pause();
        });
        mobileSupport(fighter, torpedos, stats, sound, particles);
    }

    function resetGame() {
        backgroundStars = { stars: [] };
        fighter.lives = 3;
        fighter.center = { x: 600, y: 1470 };
        fighter.dead = false;
        fighter.deadTimer = 0;
        fighter.invulnerableTimer = 1000;
        fighter.mobileMoveVal = 50;
        torpedos.friendly = [];
        torpedos.enemy = [];
        stats.score = 0;
        stats.totalTorpedosFired = 0;
        stats.totalHits = 0;
        stats.currentTime = 0;
        stats.showPlayerStats = false;
        stats.showPlayerResults = false;
        stats.endGameTimer = 5000;
        stats.highScore = LocalScores.persistence.getHighScore();
        stats.stage.currentStage = 1;
        stats.stage.stageTime = 0;
        stats.stage.showStageTimer = 5000;
        stats.stage.torpedosFired = 0;
        stats.stage.hits = 0;
        stats.stage.endingStage = false;
        stats.stage.endingStageTimer = 500;
        stats.stage.stageEnemies = getStage(1);
        enemies.enemy = [];
        enemies.divingTimer = 17000;
        enemies.formationSprite = 0;
        enemies.formationSpriteCount = 500;
        enemies.formationLeftRight = 4;
        enemies.formationOffsetX = 0;
        enemies.formationOffsetBreath = 1;
        enemies.formationBreathOut = true;
        while (particles.particle.length > 0 && particles.pool.length < particles.maxParticles) {
            particles.pool.push(particles.particle.pop());
        }
        particles.particle.length = 0;
        particles.popups = [];
        particles.shake = { magnitude: 0, time: 0, duration: 0 };
        particles.quality = 1;
        particles.maxParticles = LocalOptions.persistence.getReduceMotion() ? 150 : 260;
        particles.engineAccumulator = 0;
        particles.lastStageBurst = 0;
        ai = { fireTimer: 5000 };
        if (MyGame.ui && MyGame.ui.updateStats) MyGame.ui.updateStats(stats);
    }

    function configureInput() {
        myKeyboard.clearHandlers();
        myKeyboard.register('Escape', togglePause, { repeat: false });
        myKeyboard.register('p', togglePause, { repeat: false });
        myKeyboard.register('P', togglePause, { repeat: false });
        const options = LocalOptions.persistence.getOptions();
        options.forEach((option) => {
            if (option.action === 'left') {
                myKeyboard.register(option.key, () => { if (!paused) moveFighterLeft(fighter, 1); });
            } else if (option.action === 'right') {
                myKeyboard.register(option.key, () => { if (!paused) moveFighterRight(fighter, 1); });
            } else if (option.action === 'fire') {
                myKeyboard.register(option.key, () => { if (!paused) fireTorpedo(fighter, torpedos, stats, sound, particles); }, { repeat: false });
            }
        });
    }

    function run() {
        configureInput();
        paused = false;
        pauseOverlay.hidden = true;
        document.body.classList.remove('is-paused');
        stats.highScore = LocalScores.persistence.getHighScore();
        torpedos.noLimit = attractMode ? false : !LocalOptions.persistence.getTorpedoLimit();

        sound.musicPhase = false;
        if (!attractMode) {
            if (!sound.musicRequested) {
                sound.musicRequested = true;
                try { sound.music.load(); } catch (error) { /* buffering is best-effort */ }
                try { sound.voice.load(); } catch (error) { /* buffering is best-effort */ }
            }
            if (sound.theme.isReady) {
                sound.theme.currentTime = 0;
                sound.theme.play().catch(() => {});
            }
        }
        if (attractMode) {
            canvas.addEventListener('pointerdown', leaveAttractMode, { once: true });
            window.addEventListener('keydown', leaveAttractMode, { once: true });
        }

        lastTimeStamp = performance.now();
        cancelNextRequest = false;
        quit = false;
        canvas.focus({ preventScroll: true });
        requestAnimationFrame(gameLoop);
    }

    function leaveAttractMode() {
        if (!attractMode) return;
        endGame();
    }

    function pause() {
        if (paused || attractMode || game.getActiveScreen() !== 'game-play') return;
        paused = true;
        pauseOverlay.hidden = false;
        document.body.classList.add('is-paused');
        sound.theme.pause();
        sound.music.pause();
        sound.voice.pause();
        window.requestAnimationFrame(() => document.getElementById('id-resume-game').focus());
    }

    function resume() {
        if (!paused) return;
        paused = false;
        pauseOverlay.hidden = true;
        document.body.classList.remove('is-paused');
        if (!attractMode) {
            if (sound.musicPhase) {
                playSound(sound.music);
                playSound(sound.voice);
            } else if (sound.theme.currentTime > 0 && !sound.theme.ended) {
                playSound(sound.theme);
            }
        }
        lastTimeStamp = performance.now();
        canvas.focus({ preventScroll: true });
    }

    function togglePause() {
        if (paused) resume();
        else pause();
    }

    function exitToMenu() {
        quit = true;
        endGame();
    }

    function endGame() {
        cancelNextRequest = true;
        paused = false;
        pauseOverlay.hidden = true;
        document.body.classList.remove('is-paused');
        sounds.stopAll();
        canvas.removeEventListener('pointerdown', leaveAttractMode);
        window.removeEventListener('keydown', leaveAttractMode);

        if (attractMode) {
            attractMode = false;
            game.showScreen('main-menu');
        } else if (quit) {
            game.showScreen('main-menu');
        } else {
            saveScoreValue(stats.score);
            game.showScreen('high-scores');
        }
        resetGame();
    }

    return { initialize, run, pause, resume, togglePause, exitToMenu };
}(MyGame.game, MyGame.input, MyGame.graphics, MyGame.images, MyGame.sounds));
