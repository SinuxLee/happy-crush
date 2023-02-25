const { ccclass, property } = cc._decorator;

@ccclass
export default class extends cc.Component {
    @property(cc.ProgressBar)
    private loadingBar: cc.ProgressBar = null;
    @property(cc.Button)
    private loginButton: cc.Button = null;
    @property(cc.AudioClip)
    private worldSceneBGM: cc.AudioClip = null;

    private gameSceneBGMAudioId: number = 0;

    onLoad() {
        this.gameSceneBGMAudioId = cc.audioEngine.play(this.worldSceneBGM, true, 1);
    }

    onLogin() {
        this.loadingBar.node.active = true;
        this.loginButton.node.active = false;
        this.loadingBar.progress = 0;

        const sceneName = 'Game'
        cc.director.preloadScene(
            sceneName,
            (completed: number, total: number) => {
                const percent = Math.round(completed/total*100)/100
                this.loadingBar.progress = (percent > this.loadingBar.progress) ? percent : this.loadingBar.progress
            },
            (err: Error) => {
                if (!err) {
                    this.loadingBar.node.active = false;
                    cc.director.loadScene(sceneName);
                    return
                }

                console.log(`failed to loadScene: ${err.message}`);
            }
        );
    }

    onDestroy() {
        cc.audioEngine.stop(this.gameSceneBGMAudioId);
    }
}
