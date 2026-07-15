MyGame.ui = (function(game) {
    'use strict';

    let initialized = false;

    function formatScore(value) {
        return Math.max(0, Number(value) || 0).toString().padStart(6, '0');
    }

    function applySettings() {
        const muted = LocalOptions.persistence.getMuted();
        const reduceMotion = LocalOptions.persistence.getReduceMotion();
        const audioToggle = document.getElementById('audio-toggle');
        document.body.classList.toggle('reduce-motion', reduceMotion);
        audioToggle.setAttribute('aria-pressed', String(muted));
        audioToggle.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
        document.getElementById('audio-icon').textContent = muted ? '×' : '♪';
        if (MyGame.sounds && MyGame.sounds.syncSettings) MyGame.sounds.syncSettings();
    }

    function initialize() {
        if (initialized) return;
        initialized = true;

        document.getElementById('brand-home').addEventListener('click', function(event) {
            event.preventDefault();
            if (game.getActiveScreen() === 'game-play' && MyGame.screens['game-play'].exitToMenu) {
                MyGame.screens['game-play'].exitToMenu();
            } else {
                game.showScreen('main-menu');
            }
        });

        document.getElementById('audio-toggle').addEventListener('click', function() {
            LocalOptions.persistence.toggleMuted();
        });

        document.getElementById('pause-toggle').addEventListener('click', function() {
            if (game.getActiveScreen() === 'game-play') MyGame.screens['game-play'].togglePause();
        });

        document.getElementById('fullscreen-toggle').addEventListener('click', async function() {
            try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await document.documentElement.requestFullscreen();
            } catch (error) {
                document.getElementById('game-announcer').textContent = 'Fullscreen is not available in this browser.';
            }
        });

        document.addEventListener('fullscreenchange', function() {
            const button = document.getElementById('fullscreen-toggle');
            button.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
        });

        document.addEventListener('galaga-settings-change', applySettings);
        document.addEventListener('keydown', function(event) {
            if (event.key !== 'Escape' || game.getActiveScreen() === 'game-play') return;
            if (game.getActiveScreen() !== 'main-menu') game.showScreen('main-menu');
        });

        initializeCabinetDeck();
        applySettings();
        updateHighScore();

        // Warm up the arcade pixel font so canvas text renders with it from frame one.
        if (document.fonts && document.fonts.load) {
            document.fonts.load('12px "Press Start 2P"').catch(function() {});
        }
    }

    function initializeCabinetDeck() {
        const startButton = document.getElementById('deck-start');
        if (startButton) {
            startButton.addEventListener('click', function() {
                const active = game.getActiveScreen();
                if (active === 'main-menu') {
                    document.getElementById('id-new-game').click();
                } else if (active === 'game-play') {
                    if (MyGame.screens['game-play'].resume) MyGame.screens['game-play'].resume();
                } else {
                    game.showScreen('main-menu');
                }
            });
        }

        const joystick = document.getElementById('deck-joystick');
        if (joystick) {
            const tiltKeys = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
            document.addEventListener('keydown', function(event) {
                const direction = tiltKeys[event.key];
                if (!direction) return;
                joystick.classList.toggle('tilt-left', direction === 'left');
                joystick.classList.toggle('tilt-right', direction === 'right');
            });
            document.addEventListener('keyup', function(event) {
                if (tiltKeys[event.key]) joystick.classList.remove('tilt-left', 'tilt-right');
            });
        }

        const coinSlot = document.getElementById('deck-coin');
        if (coinSlot) {
            let coinSound = null;
            coinSlot.addEventListener('click', function() {
                if (!coinSound && MyGame.sounds && MyGame.sounds.loadCoin) coinSound = MyGame.sounds.loadCoin();
                if (coinSound) {
                    try { coinSound.currentTime = 0; } catch (error) { /* metadata not loaded yet */ }
                    coinSound.play().catch(function() {});
                }
                coinSlot.classList.remove('is-coined');
                void coinSlot.offsetWidth;
                coinSlot.classList.add('is-coined');
            });
        }
    }

    function updateHighScore() {
        document.getElementById('shell-high-score').textContent = formatScore(LocalScores.persistence.getHighScore());
    }

    function updateStats(stats) {
        if (!stats || !stats.stage) return;
        document.getElementById('shell-stage').textContent = String(stats.stage.currentStage).padStart(2, '0');
        const shots = stats.totalTorpedosFired + stats.stage.torpedosFired;
        const hits = stats.totalHits + stats.stage.hits;
        const accuracy = shots > 0 ? Math.round(hits / shots * 100) + '%' : '—';
        document.getElementById('shell-accuracy').textContent = accuracy;
        const best = Math.max(stats.highScore || 0, stats.score || 0);
        document.getElementById('shell-high-score').textContent = formatScore(best);
    }

    function onScreenChange(id) {
        if (id !== 'game-play') updateHighScore();
    }

    return { initialize, updateStats, updateHighScore, onScreenChange, formatScore };
}(MyGame.game));
