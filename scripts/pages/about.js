MyGame.screens['about'] = (function(game) {
    'use strict';

    function initialize() {
        document.getElementById('id-about-back').addEventListener('click', () => game.showScreen('main-menu'));
    }

    function run() {
        window.requestAnimationFrame(() => document.getElementById('id-about-back').focus());
    }

    return { initialize, run };
}(MyGame.game));
