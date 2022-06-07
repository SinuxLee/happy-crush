import { CELL_TYPE, ANITIME, CELL_STATUS } from './ConstValue';
export default class CellModel {
    private x: number = 1;
    private y: number = 1;
    private startX: number = 1;
    private startY: number = 1;
    private cmd = [];
    private isDeath: boolean = false;
    private objecCount: number = 0;
    private status;

    public type;

    constructor() {
        this.type = null;
        this.status = CELL_STATUS.COMMON;
        this.objecCount = Math.floor(Math.random() * 1000);
    }

    init(type) {
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

    setStatus(status) {
        this.status = status;
    }

    moveToAndBack(pos) {
        let srcPos = cc.v2(this.x, this.y);
        this.cmd.push({
            action: 'moveTo',
            keepTime: ANITIME.TOUCH_MOVE,
            playTime: 0,
            pos: pos,
        });
        this.cmd.push({
            action: 'moveTo',
            keepTime: ANITIME.TOUCH_MOVE,
            playTime: ANITIME.TOUCH_MOVE,
            pos: srcPos,
        });
    }

    moveTo(pos, playTime) {
        this.cmd.push({
            action: 'moveTo',
            keepTime: ANITIME.TOUCH_MOVE,
            playTime: playTime,
            pos: pos,
        });
        this.x = pos.x;
        this.y = pos.y;
    }

    toDie(playTime) {
        this.cmd.push({
            action: 'toDie',
            playTime: playTime,
            keepTime: ANITIME.DIE,
        });
        this.isDeath = true;
    }

    toShake(playTime) {
        this.cmd.push({
            action: 'toShake',
            playTime: playTime,
            keepTime: ANITIME.DIE_SHAKE,
        });
    }

    setVisible(playTime, isVisible) {
        this.cmd.push({
            action: 'setVisible',
            playTime: playTime,
            keepTime: 0,
            isVisible: isVisible,
        });
    }

    isBird() {
        return this.type == CELL_TYPE.G;
    }
}
