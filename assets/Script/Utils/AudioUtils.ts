const { ccclass, property } = cc._decorator;

@ccclass
export default class extends cc.Component{
    @property(cc.AudioClip)
    private swap: cc.AudioClip = null;

    @property(cc.AudioClip)
    private click: cc.AudioClip = null;

    @property([cc.AudioClip])
    private eliminate: cc.AudioClip[] = [];

    @property([cc.AudioClip])
    private continuousMatch: cc.AudioClip[] = [];

    playClick () {
        cc.audioEngine.play(this.click, false, 1);
    }

    playSwap () {
        cc.audioEngine.play(this.swap, false, 1);
    }

    playEliminate (step: number) {
        step = Math.min(this.eliminate.length - 1, step);
        cc.audioEngine.play(this.eliminate[step], false, 1);
    }

    playContinuousMatch (step: number) {
        console.log('step = ', step);
        step = Math.min(step, 11);
        if (step < 2) {
            return;
        }
        cc.audioEngine.play(
            this.continuousMatch[Math.floor(step / 2) - 1],
            false,
            1
        );
    }
}
