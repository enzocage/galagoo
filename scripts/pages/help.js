MyGame.screens['help'] = (function(game) {
    'use strict';

    const keyButtons = {
        left: 'move-left-btn',
        right: 'move-right-btn',
        fire: 'fire-torpedo-btn'
    };
    let listeningAction = null;

    function keyLabel(key) {
        const labels = {
            ' ': 'SPACE',
            ArrowLeft: '←',
            ArrowRight: '→',
            ArrowUp: '↑',
            ArrowDown: '↓'
        };
        return labels[key] || key.toUpperCase();
    }

    function renderControls() {
        const options = LocalOptions.persistence.getOptions();
        Object.keys(keyButtons).forEach((action) => {
            const labels = [...new Set(options.filter((option) => option.action === action).map((option) => keyLabel(option.key)))];
            document.getElementById(keyButtons[action]).textContent = labels.join(' / ');
        });
    }

    function stopListening() {
        if (!listeningAction) return;
        document.getElementById(keyButtons[listeningAction]).classList.remove('is-listening');
        listeningAction = null;
        renderControls();
    }

    function startListening(action) {
        stopListening();
        listeningAction = action;
        const button = document.getElementById(keyButtons[action]);
        button.classList.add('is-listening');
        button.textContent = 'PRESS A KEY';
    }

    function handleKeyCapture(event) {
        if (!listeningAction) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') {
            stopListening();
            return;
        }
        if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key)) return;
        saveOption(event.key.length === 1 ? event.key.toLowerCase() : event.key, listeningAction);
        stopListening();
    }

    function syncSettingsUI() {
        const volume = Math.round(LocalOptions.persistence.getVolume() * 100);
        const musicVolume = Math.round(LocalOptions.persistence.getMusicVolume() * 100);
        const voiceVolume = Math.round(LocalOptions.persistence.getVoiceVolume() * 100);
        document.getElementById('torpedo-limit-toggle').checked = LocalOptions.persistence.getTorpedoLimit();
        document.getElementById('motion-toggle').checked = LocalOptions.persistence.getReduceMotion();
        document.getElementById('volume-control').value = String(volume);
        document.getElementById('volume-value').textContent = volume + '%';
        document.getElementById('music-volume-control').value = String(musicVolume);
        document.getElementById('music-volume-value').textContent = musicVolume + '%';
        document.getElementById('voice-volume-control').value = String(voiceVolume);
        document.getElementById('voice-volume-value').textContent = voiceVolume + '%';
        renderControls();
    }

    function initialize() {
        document.getElementById('id-help-back').addEventListener('click', () => game.showScreen('main-menu'));
        document.getElementById('resetOptions').addEventListener('click', resetOptions);
        Object.keys(keyButtons).forEach((action) => {
            document.getElementById(keyButtons[action]).addEventListener('click', () => startListening(action));
        });
        document.addEventListener('keydown', handleKeyCapture, true);

        document.getElementById('torpedo-limit-toggle').addEventListener('change', (event) => {
            LocalOptions.persistence.setTorpedoLimit(event.target.checked);
        });
        document.getElementById('motion-toggle').addEventListener('change', (event) => {
            LocalOptions.persistence.setReduceMotion(event.target.checked);
        });
        document.getElementById('volume-control').addEventListener('input', (event) => {
            const volume = Number(event.target.value);
            document.getElementById('volume-value').textContent = volume + '%';
            LocalOptions.persistence.setVolume(volume / 100);
        });
        document.getElementById('music-volume-control').addEventListener('input', (event) => {
            const volume = Number(event.target.value);
            document.getElementById('music-volume-value').textContent = volume + '%';
            LocalOptions.persistence.setMusicVolume(volume / 100);
        });
        document.getElementById('voice-volume-control').addEventListener('input', (event) => {
            const volume = Number(event.target.value);
            document.getElementById('voice-volume-value').textContent = volume + '%';
            LocalOptions.persistence.setVoiceVolume(volume / 100);
        });
    }

    function run() {
        stopListening();
        syncSettingsUI();
    }

    return { initialize, run };
}(MyGame.game));
