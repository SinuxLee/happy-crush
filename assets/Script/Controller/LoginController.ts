const {ccclass,property} = cc._decorator;

@ccclass
export default class extends cc.Component{
    @property(cc.ProgressBar)
    private loadingBar: cc.ProgressBar = null;
    @property(cc.Button)
    private loginButton: cc.Button = null;
    @property(cc.AudioClip)
    private worldSceneBGM: cc.AudioClip = null;

    private gameSceneBGMAudioId: number = 0;

    onLoad() {
        this.gameSceneBGMAudioId = cc.audioEngine.play(
            this.worldSceneBGM,
            true,
            1
        );
    }

    onLogin () {
        this.loadingBar.node.active = true;
        this.loginButton.node.active = false;
        this.loadingBar.progress = 0;

        let backup = cc.loader.onProgress;
        cc.loader.onProgress = (count, amount) => {
            this.loadingBar.progress = count / amount;
        };

        cc.director.preloadScene(
            'Game',
            () => {
                cc.loader.onProgress = backup;
                this.loadingBar.node.active = false;
                this.loginButton.node.active = true;
                cc.director.loadScene('Game');
            }
        );
    }

    onDestroy () {
        cc.audioEngine.stop(this.gameSceneBGMAudioId);
    }
}
