import {
    CELL_WIDTH,
    CELL_HEIGHT,
    GRID_PIXEL_WIDTH,
    GRID_PIXEL_HEIGHT,
} from '../Model/ConstValue';
import AudioUtils from '../Utils/AudioUtils';

cc.Class({
    extends: cc.Component,

    properties: {
        aniPre: {
            default: [],
            type: [cc.Prefab],
        },
        effectLayer: {
            default: null,
            type: cc.Node,
        },
        audioUtils: {
            type: AudioUtils,
            default: null,
        },
    },

    onLoad: function () {
        this.setListener();
        this.lastTouchPos = cc.Vec2(-1, -1);
        this.isCanMove = true;
        this.isInPlayAni = false; // 是否在播放中
    },

    setController: function (controller) {
        this.controller = controller;
    },

    initWithCellModels: function (cellsModels) {
        this.cellViews = [];
        for (let i = 1; i <= 9; i++) {
            this.cellViews[i] = [];
            for (let j = 1; j <= 9; j++) {
                let type = cellsModels[i][j].type;
                let aniView = cc.instantiate(this.aniPre[type]);
                aniView.parent = this.node;
                let cellViewScript = aniView.getComponent('CellView');
                cellViewScript.initWithModel(cellsModels[i][j]);
                this.cellViews[i][j] = aniView;
            }
        }
    },

    setListener: function () {
        this.node.on(
            cc.Node.EventType.TOUCH_START,
            (eventTouch) => {
                if (this.isInPlayAni) {
                    //播放动画中，不允许点击
                    return true;
                }
                let touchPos = eventTouch.getLocation();
                let cellPos = this.convertTouchPosToCell(touchPos);
                if (cellPos) {
                    let changeModels = this.selectCell(cellPos);
                    this.isCanMove = changeModels.length < 3;
                } else {
                    this.isCanMove = false;
                }
                return true;
            },
            this
        );

        // 滑动操作逻辑
        this.node.on(
            cc.Node.EventType.TOUCH_MOVE,
            (eventTouch) => {
                if (this.isCanMove) {
                    let startTouchPos = eventTouch.getStartLocation();
                    let startCellPos =
                        this.convertTouchPosToCell(startTouchPos);
                    let touchPos = eventTouch.getLocation();
                    let cellPos = this.convertTouchPosToCell(touchPos);
                    if (
                        startCellPos.x != cellPos.x ||
                        startCellPos.y != cellPos.y
                    ) {
                        this.isCanMove = false;
                        let changeModels = this.selectCell(cellPos);
                    }
                }
            },
            this
        );

        this.node.on(
            cc.Node.EventType.TOUCH_END,
            (eventTouch) => {
                // console.log("1111");
            },
            this
        );

        this.node.on(
            cc.Node.EventType.TOUCH_CANCEL,
            (eventTouch) => {
                // console.log("1111");
            },
            this
        );
    },

    // 根据点击的像素位置，转换成网格中的位置
    convertTouchPosToCell: function (pos) {
        pos = this.node.convertToNodeSpaceAR(pos);
        if (
            pos.x < 0 ||
            pos.x >= GRID_PIXEL_WIDTH ||
            pos.y < 0 ||
            pos.y >= GRID_PIXEL_HEIGHT
        ) {
            return false;
        }
        let x = Math.floor(pos.x / CELL_WIDTH) + 1;
        let y = Math.floor(pos.y / CELL_HEIGHT) + 1;
        return cc.v2(x, y);
    },

    // 移动格子
    updateView: function (changeModels) {
        let newCellViewInfo = [];
        for (let i in changeModels) {
            let model = changeModels[i];
            let viewInfo = this.findViewByModel(model);
            let view = null;
            // 如果原来的cell不存在，则新建
            if (!viewInfo) {
                let type = model.type;
                let aniView = cc.instantiate(this.aniPre[type]);
                aniView.parent = this.node;
                let cellViewScript = aniView.getComponent('CellView');
                cellViewScript.initWithModel(model);
                view = aniView;
            }
            // 如果已经存在
            else {
                view = viewInfo.view;
                this.cellViews[viewInfo.y][viewInfo.x] = null;
            }
            let cellScript = view.getComponent('CellView');
            cellScript.updateView(); // 执行移动动作
            if (!model.isDeath) {
                newCellViewInfo.push({
                    model: model,
                    view: view,
                });
            }
        }
        // 重新标记this.cellviews的信息
        newCellViewInfo.forEach(function (ele) {
            let model = ele.model;
            this.cellViews[model.y][model.x] = ele.view;
        }, this);
    },

    // 显示选中的格子背景
    updateSelect: function (pos) {
        for (let i = 1; i <= 9; i++) {
            for (let j = 1; j <= 9; j++) {
                if (this.cellViews[i][j]) {
                    let cellScript =
                        this.cellViews[i][j].getComponent('CellView');
                    if (pos.x == j && pos.y == i) {
                        cellScript.setSelect(true);
                    } else {
                        cellScript.setSelect(false);
                    }
                }
            }
        }
    },

    /**
     * 根据cell的model返回对应的view
     */
    findViewByModel: function (model) {
        for (let i = 1; i <= 9; i++) {
            for (let j = 1; j <= 9; j++) {
                if (
                    this.cellViews[i][j] &&
                    this.cellViews[i][j].getComponent('CellView').model == model
                ) {
                    return { view: this.cellViews[i][j], x: j, y: i };
                }
            }
        }
        return null;
    },

    getPlayAniTime: function (changeModels) {
        if (!changeModels) {
            return 0;
        }
        let maxTime = 0;
        changeModels.forEach(function (ele) {
            ele.cmd.forEach(function (cmd) {
                if (maxTime < cmd.playTime + cmd.keepTime) {
                    maxTime = cmd.playTime + cmd.keepTime;
                }
            }, this);
        }, this);
        return maxTime;
    },

    // 获得爆炸次数， 同一个时间算一个
    getStep: function (effectsQueue) {
        if (!effectsQueue) {
            return 0;
        }
        return effectsQueue.reduce(function (maxValue, efffectCmd) {
            return Math.max(maxValue, efffectCmd.step || 0);
        }, 0);
    },

    //一段时间内禁止操作
    disableTouch: function (time, step) {
        if (time <= 0) {
            return;
        }
        this.isInPlayAni = true;
        this.node.runAction(
            cc.sequence(
                cc.delayTime(time),
                cc.callFunc(function () {
                    this.isInPlayAni = false;
                    this.audioUtils.playContinuousMatch(step);
                }, this)
            )
        );
    },

    // 正常击中格子后的操作
    selectCell: function (cellPos) {
        let result = this.controller.selectCell(cellPos); // 直接先丢给model处理数据逻辑
        let changeModels = result[0]; // 有改变的cell，包含新生成的cell和生成马上摧毁的格子
        let effectsQueue = result[1]; //各种特效
        this.playEffect(effectsQueue);
        this.disableTouch(
            this.getPlayAniTime(changeModels),
            this.getStep(effectsQueue)
        );
        this.updateView(changeModels);
        this.controller.cleanCmd();
        if (changeModels.length >= 2) {
            this.updateSelect(cc.v2(-1, -1));
            this.audioUtils.playSwap();
        } else {
            this.updateSelect(cellPos);
            this.audioUtils.playClick();
        }
        return changeModels;
    },

    playEffect: function (effectsQueue) {
        this.effectLayer.getComponent('EffectLayer').playEffects(effectsQueue);
    },
});
