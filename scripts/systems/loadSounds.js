MyGame.sounds = (function() {
    'use strict';

    const sounds = new Set();

    function getLevel() {
        if (LocalOptions.persistence.getMuted()) return 0;
        return LocalOptions.persistence.getVolume() * 0.42;
    }

    function createSound(source, gain = 1, kind = 'sfx') {
        const sound = new Audio(source);
        sound.isReady = false;
        // The streamed gameplay music is fetched lazily on first game start,
        // not on page load — it buffers while the intro theme plays.
        sound.preload = kind === 'sfx' ? 'auto' : 'none';
        sound.dataset.gain = String(gain);
        sound.dataset.kind = kind;
        sound.addEventListener('canplay', function() { sound.isReady = true; }, { once: true });
        sound.addEventListener('error', function() { sound.isReady = false; });
        sounds.add(sound);
        syncSound(sound);
        return sound;
    }

    function syncSound(sound) {
        const gain = Number(sound.dataset.gain || 1);
        // Each streamed soundtrack layer has its own slider, independent of SFX.
        let level = getLevel();
        if (sound.dataset.kind === 'music') {
            level = LocalOptions.persistence.getMuted() ? 0 : LocalOptions.persistence.getMusicVolume();
        } else if (sound.dataset.kind === 'voice') {
            level = LocalOptions.persistence.getMuted() ? 0 : LocalOptions.persistence.getVoiceVolume();
        }
        sound.volume = Math.max(0, Math.min(1, level * gain));
    }

    function syncSettings() {
        sounds.forEach(syncSound);
    }

    function stopAll() {
        sounds.forEach((sound) => {
            try {
                sound.pause();
                sound.currentTime = 0;
            } catch (error) {
                // Some browsers reject seeking audio before metadata is loaded.
            }
        });
    }

    document.addEventListener('galaga-settings-change', syncSettings);

    return {
        loadTheme: () => createSound('./sounds/Theme_Song.mp3', 0.7),
        loadTorpedo: () => createSound('./sounds/Firing_Sound.mp3', 0.72),
        loadDiving: () => createSound('./sounds/Flying_Enemy_Sound.mp3', 0.75),
        loadEnemyDeath: () => createSound('./sounds/Kill_Enemy_Sound.mp3', 0.9),
        loadBossHurt: () => createSound('./sounds/Boss_Hurt_Sound.mp3', 0.9),
        loadBossDeath: () => createSound('./sounds/Boss_Death_Sound.mp3', 1),
        loadPlayerDeath: () => createSound('./sounds/Player_Death.mp3', 1),
        loadLevel: () => createSound('./sounds/Level_Start.mp3', 0.9),
        loadCoin: () => createSound('./sounds/Coin_Sound.mp3', 0.85),
        loadMusic: () => createSound('https://files.catbox.moe/1eupdc.mp3', 1, 'music'),
        loadVoice: () => createSound('https://files.catbox.moe/fhqf8e.mp3', 1, 'voice'),
        syncSettings,
        stopAll
    };
}());
