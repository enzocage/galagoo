MyGame.input.Keyboard = function () {
    'use strict';

    const that = {
        keys: {},
        handlers: {}
    };
    const pending = {};

    function isTypingTarget(target) {
        return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    }

    function keyPress(event) {
        if (isTypingTarget(event.target)) return;
        if (!Object.prototype.hasOwnProperty.call(that.keys, event.key)) {
            that.keys[event.key] = event.timeStamp;
            if (that.handlers[event.key] && !that.handlers[event.key].repeat) pending[event.key] = true;
        }
        if (that.handlers[event.key] && MyGame.game && MyGame.game.getActiveScreen() === 'game-play') {
            event.preventDefault();
        }
    }

    function keyRelease(event) {
        delete that.keys[event.key];
    }

    function clearPressedKeys() {
        that.keys = {};
        Object.keys(pending).forEach((key) => delete pending[key]);
    }

    that.update = function (elapsedTime) {
        for (const key in pending) {
            const spec = that.handlers[key];
            if (spec) spec.handler(elapsedTime);
            delete pending[key];
        }
        for (const key in that.keys) {
            if (!Object.prototype.hasOwnProperty.call(that.keys, key)) continue;
            const spec = that.handlers[key];
            if (!spec || !spec.repeat) continue;
            spec.handler(elapsedTime);
        }
    };

    that.register = function (key, handler, options = {}) {
        that.handlers[key] = { handler, repeat: options.repeat !== false };
    };

    that.clearHandlers = function () {
        that.handlers = {};
        clearPressedKeys();
    };

    that.setFireKey = function () {};

    window.addEventListener('keydown', keyPress, { passive: false });
    window.addEventListener('keyup', keyRelease);
    window.addEventListener('blur', clearPressedKeys);
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearPressedKeys();
    });

    return that;
};
