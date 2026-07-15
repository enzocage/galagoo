MyGame.game = (function(screens) {
    'use strict';

    let activeScreenId = null;

    function showScreen(id) {
        if (!screens[id]) return;

        document.querySelectorAll('#game .screen').forEach((screen) => {
            const isActive = screen.id === id;
            screen.classList.toggle('active', isActive);
            screen.setAttribute('aria-hidden', String(!isActive));
        });

        activeScreenId = id;
        document.body.dataset.screen = id;
        document.body.classList.toggle('is-game-active', id === 'game-play');
        screens[id].run();

        if (MyGame.ui && MyGame.ui.onScreenChange) MyGame.ui.onScreenChange(id);
    }

    function getActiveScreen() {
        return activeScreenId;
    }

    function initialize() {
        for (const screen in screens) {
            if (Object.prototype.hasOwnProperty.call(screens, screen)) screens[screen].initialize();
        }
        if (MyGame.ui && MyGame.ui.initialize) MyGame.ui.initialize();
        showScreen('main-menu');
    }

    return { initialize, showScreen, getActiveScreen };
}(MyGame.screens));

let attractMode = false;
