import { CELL_WIDTH } from '../Model/ConstValue';
import AudioUtils from '../Utils/AudioUtils';
const { ccclass, property } = cc._decorator;

export class Command{
    constructor(
        public action:string, public keepTime:number,
        public playTime:number, public pos: cc.Vec2,
        public isVisible:boolean, public step: number
    ){}
}

@ccclass
export default class extends cc.Component {
    @property(cc.Prefab)
    private bombWhite: cc.Prefab = null;

    @property(cc.Prefab)
    private crushEffect: cc.Prefab = null;

    @property(AudioUtils)
    private audioUtils: AudioUtils = null;

    playEffects(effectQueue: Command[]) {
        if (!effectQueue || effectQueue.length <= 0) return;

        let soundMap = {}; //某一时刻，某一种声音是否播放过的标记，防止重复播放
        effectQueue.forEach((cmd: Command) => {
            let delayTime = cc.delayTime(cmd.playTime);
            let callFunc = cc.callFunc(() => {
                let instantEffect = null;
                let animation = null;
                if (cmd.action == 'crush') {
                    instantEffect = cc.instantiate(this.crushEffect);
                    animation = instantEffect.getComponent(cc.Animation);
                    animation.play('effect');
                    !soundMap['crush' + cmd.playTime] &&
                        this.audioUtils.playEliminate(cmd.step);
                    soundMap['crush' + cmd.playTime] = true;
                } else if (cmd.action == 'rowBomb') {
                    instantEffect = cc.instantiate(this.bombWhite);
                    animation = instantEffect.getComponent(cc.Animation);
                    animation.play('effect_line');
                } else if (cmd.action == 'colBomb') {
                    instantEffect = cc.instantiate(this.bombWhite);
                    animation = instantEffect.getComponent(cc.Animation);
                    animation.play('effect_col');
                }

                instantEffect.x = CELL_WIDTH * (cmd.pos.x - 0.5);
                instantEffect.y = CELL_WIDTH * (cmd.pos.y - 0.5);
                instantEffect.parent = this.node;
                animation.on(
                    'finished',
                    () => {
                        instantEffect.destroy();
                    },
                    this
                );
            }, this);

            // cc.Tween
            this.node.runAction(cc.sequence(delayTime, callFunc));
        }, this);
    }
}
