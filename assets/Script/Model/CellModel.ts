import { Command } from '../View/EffectLayer';
import { CELL_TYPE, ANITIME, CELL_STATUS } from './ConstValue';

export default class CellModel {
    public cmd: Command[] = [];
    public isDeath = false;
    public startX: number = 1;
    public startY: number = 1;
    public x: number = 1; // 在数组中的位置
    public y: number = 1;
    public type = 0; // 动物类型
    public status = '';

    constructor() {
        this.status = CELL_STATUS.COMMON;
    }

    init(type: number) {
        this.type = type;
    }

    isEmpty() {
        return this.type == CELL_TYPE.EMPTY;
    }

    setEmpty() {
        this.type = CELL_TYPE.EMPTY;
    }

    setXY(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setStartXY(x: number, y: number) {
        this.startX = x;
        this.startY = y;
    }

    setStatus(status: string) {
        this.status = status;
    }

    moveToAndBack(pos: cc.Vec2) {
        let srcPos = cc.v2(this.x, this.y);
        this.cmd.push({
            step: 0,
            action: 'moveTo',
            keepTime: ANITIME.TOUCH_MOVE,
            playTime: 0,
            pos: pos,
            isVisible: false,
        });
        this.cmd.push({
            step: 0,
            action: 'moveTo',
            keepTime: ANITIME.TOUCH_MOVE,
            playTime: ANITIME.TOUCH_MOVE,
            pos: srcPos,
            isVisible: false,
        });
    }

    moveTo(pos: cc.Vec2, playTime: number) {
        this.cmd.push({
            step: 0,
            action: 'moveTo',
            keepTime: ANITIME.TOUCH_MOVE,
            playTime: playTime,
            pos: pos,
            isVisible: false,
        });
        this.x = pos.x;
        this.y = pos.y;
    }

    toDie(playTime: number) {
        this.cmd.push({
            step: 0,
            action: 'toDie',
            playTime: playTime,
            keepTime: ANITIME.DIE,
            pos: null,
            isVisible: false,
        });
        this.isDeath = true;
    }

    toShake(playTime: number) {
        this.cmd.push({
            step: 0,
            action: 'toShake',
            playTime: playTime,
            keepTime: ANITIME.DIE_SHAKE,
            pos: null,
            isVisible: false,
        });
    }

    setVisible(playTime: number, isVisible: boolean) {
        this.cmd.push({
            step: 0,
            action: 'setVisible',
            playTime: playTime,
            keepTime: 0,
            pos: null,
            isVisible: isVisible,
        });
    }

    isBird() {
        return this.type == CELL_TYPE.BIRD;
    }
}
