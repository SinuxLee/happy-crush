cc.Class({
    extends: cc.Component,

    properties: {
        loadingBar: {
            type: cc.ProgressBar,
            default: null,
        },
        loginButton: {
            type: cc.Button,
            default: null,
        },
        worldSceneBGM: {
            type: cc.AudioClip,
            default: null,
        },
    },

    onLoad() {
        this.gameSceneBGMAudioId = cc.audioEngine.play(
            this.worldSceneBGM,
            true,
            1
        );
    },

    start() {},

    onLogin: function () {
        this.loadingBar.node.active = true;
        this.loginButton.node.active = false;
        this.loadingBar.progress = 0;
        let backup = cc.loader.onProgress;
        cc.loader.onProgress = function (count, amount) {
            this.loadingBar.progress = count / amount;
        }.bind(this);

        cc.director.preloadScene(
            'Game',
            function () {
                cc.loader.onProgress = backup;
                this.loadingBar.node.active = false;
                this.loginButton.node.active = true;
                cc.director.loadScene('Game');
            }.bind(this)
        );
    },

    onDestroy: function () {
        cc.audioEngine.stop(this.gameSceneBGMAudioId);
    },
});
