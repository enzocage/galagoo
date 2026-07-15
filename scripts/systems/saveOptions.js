'use strict';

let LocalOptions = {
    persistence: (function () {
        const controlsKey = 'LocalSave.options';
        const settingsKey = 'LocalSave.settings';
        const defaultOptions = [
            { key: 'ArrowLeft', action: 'left' },
            { key: 'a', action: 'left' },
            { key: 'ArrowRight', action: 'right' },
            { key: 'd', action: 'right' },
            { key: ' ', action: 'fire' }
        ];
        const defaultSettings = {
            torpedoLimit: false,
            volume: 0.55,
            musicVolume: 0.15,
            voiceVolume: 0.15,
            muted: false,
            reduceMotion: false
        };

        function readJSON(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value === null ? fallback : JSON.parse(value);
            } catch (error) {
                return fallback;
            }
        }

        let options = readJSON(controlsKey, defaultOptions.map((option) => ({ ...option })));
        let settings = { ...defaultSettings, ...readJSON(settingsKey, {}) };

        function persist() {
            try {
                localStorage.setItem(controlsKey, JSON.stringify(options));
                localStorage.setItem(settingsKey, JSON.stringify(settings));
            } catch (error) {
                // The game remains playable when storage is disabled or full.
            }
            document.dispatchEvent(new CustomEvent('galaga-settings-change', { detail: { ...settings } }));
        }

        function addOption(key, action) {
            options.push({ key: key, action: action });
            persist();
        }

        function removeOption(action) {
            options = options.filter((option) => option.action !== action);
            persist();
        }

        function getOptions() {
            return options.map((option) => ({ ...option }));
        }

        function setOption(key, action) {
            const retainedDefaults = defaultOptions.filter((option) => option.action === action && option.key !== key && (option.key.startsWith('Arrow')));
            options = options.filter((option) => option.action !== action);
            options.push(...retainedDefaults, { key: key, action: action });
            persist();
        }

        function reset() {
            options = defaultOptions.map((option) => ({ ...option }));
            settings = { ...defaultSettings };
            persist();
        }

        function getTorpedoLimit() { return Boolean(settings.torpedoLimit); }
        function setTorpedoLimit(value) { settings.torpedoLimit = Boolean(value); persist(); }
        function toggleTorpedoLimit() { setTorpedoLimit(!settings.torpedoLimit); }

        function getVolume() { return Number(settings.volume); }
        function setVolume(value) {
            settings.volume = Math.max(0, Math.min(1, Number(value)));
            settings.muted = settings.volume === 0;
            persist();
        }

        function getMusicVolume() { return Number(settings.musicVolume); }
        function setMusicVolume(value) {
            settings.musicVolume = Math.max(0, Math.min(1, Number(value)));
            persist();
        }

        function getVoiceVolume() { return Number(settings.voiceVolume); }
        function setVoiceVolume(value) {
            settings.voiceVolume = Math.max(0, Math.min(1, Number(value)));
            persist();
        }

        function getMuted() { return Boolean(settings.muted); }
        function setMuted(value) { settings.muted = Boolean(value); persist(); }
        function toggleMuted() { setMuted(!settings.muted); }

        function getReduceMotion() { return Boolean(settings.reduceMotion); }
        function setReduceMotion(value) { settings.reduceMotion = Boolean(value); persist(); }

        persist();

        return {
            addOption,
            removeOption,
            getOptions,
            setOption,
            reset,
            getTorpedoLimit,
            setTorpedoLimit,
            toggleTorpedoLimit,
            getVolume,
            setVolume,
            getMusicVolume,
            setMusicVolume,
            getVoiceVolume,
            setVoiceVolume,
            getMuted,
            setMuted,
            toggleMuted,
            getReduceMotion,
            setReduceMotion
        };
    }())
};

function saveOption(value, action) {
    LocalOptions.persistence.setOption(value, action);
}

function resetOptions() {
    LocalOptions.persistence.reset();
    if (MyGame.sounds && MyGame.sounds.syncSettings) MyGame.sounds.syncSettings();
    MyGame.game.showScreen('main-menu');
}
