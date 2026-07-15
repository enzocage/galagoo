MyGame.screens['main-menu'] = (function(game) {
    'use strict';

    const buttonIds = ['id-new-game', 'id-high-scores', 'id-help', 'id-about'];
    let idleTimer = null;
    let listenersAttached = false;

    function resetIdleTimer() {
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(function() {
            if (game.getActiveScreen() === 'main-menu') {
                attractMode = true;
                game.showScreen('game-play');
            }
        }, 90000);
    }

    function initialize() {
        document.getElementById('id-new-game').addEventListener('click', function() {
            attractMode = false;
            game.showScreen('game-play');
        });
        document.getElementById('id-high-scores').addEventListener('click', () => game.showScreen('high-scores'));
        document.getElementById('id-help').addEventListener('click', () => game.showScreen('help'));
        document.getElementById('id-about').addEventListener('click', () => game.showScreen('about'));

        if (!listenersAttached) {
            ['pointerdown', 'keydown'].forEach((eventName) => document.addEventListener(eventName, resetIdleTimer, { passive: true }));
            document.addEventListener('keydown', function(event) {
                if (game.getActiveScreen() !== 'main-menu') return;
                const currentIndex = buttonIds.indexOf(document.activeElement.id);
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                    const nextIndex = (Math.max(0, currentIndex) + direction + buttonIds.length) % buttonIds.length;
                    document.getElementById(buttonIds[nextIndex]).focus();
                }
            });
            listenersAttached = true;
        }
    }

    function run() {
        attractMode = false;
        resetIdleTimer();
        const firstButton = document.getElementById(buttonIds[0]);
        if (window.matchMedia('(pointer: fine)').matches) window.requestAnimationFrame(() => firstButton.focus());
    }

    return { initialize, run };
}(MyGame.game));
