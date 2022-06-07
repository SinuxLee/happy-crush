import {
    CELL_STATUS,
    CELL_WIDTH,
    CELL_HEIGHT,
    ANITIME,
} from '../Model/ConstValue';

cc.Class({
    extends: cc.Component,

    properties: {
        defaultFrame: {
            default: null,
            type: cc.SpriteFrame,
        },
    },

    onLoad: function () {
        this.isSelect = false;
    },
    initWithModel: function (model) {
        this.model = model;
        let x = model.startX;
        let y = model.startY;
        this.node.x = CELL_WIDTH * (x - 0.5);
        this.node.y = CELL_HEIGHT * (y - 0.5);
        let animation = this.node.getComponent(cc.Animation);
        if (model.status == CELL_STATUS.COMMON) {
            animation.stop();
        } else {
            animation.play(model.status);
        }
    },

    // 执行移动动作
    updateView: function () {
        let cmd = this.model.cmd;
        if (cmd.length <= 0) {
            return;
        }
        let actionArray = [];
        let curTime = 0;
        for (let i in cmd) {
            if (cmd[i].playTime > curTime) {
                let delay = cc.delayTime(cmd[i].playTime - curTime);
                actionArray.push(delay);
            }
            if (cmd[i].action == 'moveTo') {
                let x = (cmd[i].pos.x - 0.5) * CELL_WIDTH;
                let y = (cmd[i].pos.y - 0.5) * CELL_HEIGHT;
                let move = cc.moveTo(ANITIME.TOUCH_MOVE, cc.v2(x, y));
                actionArray.push(move);
            } else if (cmd[i].action == 'toDie') {
                if (this.status == CELL_STATUS.BIRD) {
                    let animation = this.node.getComponent(cc.Animation);
                    animation.play('effect');
                    actionArray.push(cc.delayTime(ANITIME.BOMB_BIRD_DELAY));
                }
                let callFunc = cc.callFunc(function () {
                    this.node.destroy();
                }, this);
                actionArray.push(callFunc);
            } else if (cmd[i].action == 'setVisible') {
                let isVisible = cmd[i].isVisible;
                actionArray.push(
                    cc.callFunc(function () {
                        if (isVisible) {
                            this.node.opacity = 255;
                        } else {
                            this.node.opacity = 0;
                        }
                    }, this)
                );
            } else if (cmd[i].action == 'toShake') {
                let rotateRight = cc.rotateBy(0.06, 30);
                let rotateLeft = cc.rotateBy(0.12, -60);
                actionArray.push(
                    cc.repeat(
                        cc.sequence(rotateRight, rotateLeft, rotateRight),
                        2
                    )
                );
            }
            curTime = cmd[i].playTime + cmd[i].keepTime;
        }

        if (actionArray.length == 1) {
            this.node.runAction(actionArray[0]);
        } else {
            this.node.runAction(cc.sequence(...actionArray));
        }
    },

    setSelect: function (flag) {
        let animation = this.node.getComponent(cc.Animation);
        let bg = this.node.getChildByName('select');
        if (
            flag == false &&
            this.isSelect &&
            this.model.status == CELL_STATUS.COMMON
        ) {
            animation.stop();
            this.node.getComponent(cc.Sprite).spriteFrame = this.defaultFrame;
        } else if (flag && this.model.status == CELL_STATUS.COMMON) {
            animation.play(CELL_STATUS.CLICK);
        } else if (flag && this.model.status == CELL_STATUS.BIRD) {
            animation.play(CELL_STATUS.CLICK);
        }
        bg.active = flag;
        this.isSelect = flag;
    },
});
