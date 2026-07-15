'use strict';

let LocalScores = {
    persistence: (function () {
        const storageKey = 'LocalSave.highScores';
        let highScores = [20000, 0, 0, 0, 0];

        try {
            const previousScores = localStorage.getItem(storageKey);
            if (previousScores !== null) {
                const parsed = JSON.parse(previousScores);
                highScores = Array.isArray(parsed) ? parsed : Object.values(parsed);
            }
        } catch (error) {
            highScores = [20000, 0, 0, 0, 0];
        }

        function normalize() {
            highScores = highScores
                .map((score) => Math.max(0, Number(score) || 0))
                .sort((a, b) => b - a)
                .slice(0, 5);
            while (highScores.length < 5) highScores.push(0);
            try {
                localStorage.setItem(storageKey, JSON.stringify(highScores));
            } catch (error) {
                // Keep the in-memory scoreboard available in private browsing modes.
            }
        }

        function add(value) {
            highScores.push(Math.max(0, Number(value) || 0));
            normalize();
        }

        function remove(index) {
            highScores.splice(Number(index), 1);
            normalize();
        }

        function reset() {
            highScores = [0, 0, 0, 0, 0];
            normalize();
        }

        function report() {
            const list = document.getElementById('high-score-list');
            if (!list) return;
            list.replaceChildren();
            highScores.forEach((score, index) => {
                const item = document.createElement('li');
                const pilot = document.createElement('span');
                const value = document.createElement('strong');
                pilot.className = 'pilot';
                value.className = 'score';
                pilot.textContent = index === 0 ? 'TOP ACE' : 'PILOT ' + String(index + 1).padStart(2, '0');
                value.textContent = String(score).padStart(6, '0');
                item.append(pilot, value);
                list.appendChild(item);
            });
            if (MyGame.ui && MyGame.ui.updateHighScore) MyGame.ui.updateHighScore();
        }

        function getHighScore() {
            return Math.max(...highScores, 0);
        }

        normalize();
        return { add, remove, report, reset, getHighScore };
    }())
};

function saveScoreValue(value) {
    LocalScores.persistence.add(value);
    LocalScores.persistence.report();
}

function resetHighScores() {
    LocalScores.persistence.reset();
    LocalScores.persistence.report();
}
