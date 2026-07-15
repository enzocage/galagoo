MyGame.screens['high-scores'] = (function(game) {
    'use strict';

    function initialize() {
        document.getElementById('id-high-scores-back').addEventListener('click', () => game.showScreen('main-menu'));
        document.getElementById('id-reset-high-scores').addEventListener('click', resetHighScores);
    }

    function run() {
        LocalScores.persistence.report();
        window.requestAnimationFrame(() => document.getElementById('id-high-scores-back').focus());
    }

    return { initialize, run };
}(MyGame.game));
