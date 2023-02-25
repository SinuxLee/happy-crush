import GameController from '../Controller/GameController';
import CellModel from '../Model/CellModel';
import {
    CELL_WIDTH,
    CELL_HEIGHT,
    GRID_PIXEL_WIDTH,
    GRID_PIXEL_HEIGHT,
} from '../Model/ConstValue';
import AudioUtils from '../Utils/AudioUtils';
import CellView from './CellView';
import EffectLayer, { Command } from './EffectLayer';
const { ccclass, property } = cc._decorator;

@ccclass
export default class extends cc.Component {
    @property([cc.Prefab])
    private aniPre: cc.Prefab[] = [];

    @property(cc.Node)
    private effectLayer: cc.Node = null;

    @property(AudioUtils)
    private audioUtils: AudioUtils = null;

    private isCanMove = true;
    private isInPlayAni = false; // 是否在播放中
    private controller: GameController;
    private cellViews: cc.Node[][];

    onLoad() {
        this.setListener();
    }

    setController(controller: GameController) {
        this.controller = controller;
    }

    initWithCellModels(cellsModels: CellModel[][]) {
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
    }

    setListener() {
        this.node.on(cc.Node.EventType.TOUCH_START,(eventTouch: cc.Touch) => {
            // 播放动画中，不允许点击
            if (this.isInPlayAni) return true;

            let touchPos = eventTouch.getLocation();
            let cellPos = this.convertTouchPosToCell(touchPos);
            if (cellPos) {
                let changeModels = this.selectCell(cellPos);
                this.isCanMove = changeModels.length < 3;
            } else {
                this.isCanMove = false;
            }
            return true;
        });

        // 滑动操作逻辑
        this.node.on(cc.Node.EventType.TOUCH_MOVE,(eventTouch: cc.Touch) => {
            if (!this.isCanMove) return

            // 获取开始和结束的像素坐标
            const startTouchPos = eventTouch.getStartLocation();
            const touchPos = eventTouch.getLocation();

            // 将像素坐标转换成数组下标
            const startCellPos = this.convertTouchPosToCell(startTouchPos);
            const cellPos = this.convertTouchPosToCell(touchPos);
            if (cellPos == null || cellPos.equals(startCellPos)) return;

            this.isCanMove = false;
            this.selectCell(cellPos);
        });
    }

    // 根据点击的像素位置，转换成网格中的位置
    convertTouchPosToCell(pos: cc.Vec2): cc.Vec2 {
        pos = this.node.convertToNodeSpaceAR(pos);
        if (pos.x < 0 || pos.y < 0 || 
            pos.x >= GRID_PIXEL_WIDTH || 
            pos.y >= GRID_PIXEL_HEIGHT) return null;
            
        let x = Math.floor(pos.x / CELL_WIDTH) + 1;
        let y = Math.floor(pos.y / CELL_HEIGHT) + 1;
        return cc.v2(x, y);
    }

    // 移动格子
    updateView(changeModels: CellModel[]) {
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
        newCellViewInfo.forEach((ele) =>{
            let model = ele.model;
            this.cellViews[model.y][model.x] = ele.view;
        }, this);
    }

    // 显示选中的格子背景
    updateSelect(pos: cc.Vec2) {
        for (let i = 1; i <= 9; i++) {
            const row = this.cellViews[i];
            for (let j = 1; j <= 9; j++) {
                if(!row[j]) continue
                const view = row[j].getComponent(CellView)
                view.setSelect(pos.x === j && pos.y === i);
            }
        }
    }

    /**
     * 根据cell的model返回对应的view
     */
    findViewByModel(model: CellModel):{view: cc.Node;x: number;y: number;} {
        for (let i = 1; i <= 9; i++) {
            const row = this.cellViews[i]
            for (let j = 1; j <= 9; j++) {
                if(!row[j]) continue
                const view = row[j].getComponent(CellView)
                if (view.model === model) {
                    return { view: row[j], x: j, y: i };
                }
            }
        }

        return null;
    }

    getPlayAniTime(changeModels: CellModel[]): number {
        if (!changeModels) return 0;

        let maxTime = 0;
        changeModels.forEach((ele) => {
            ele.cmd.forEach((cmd: Command) => {
                if (maxTime < cmd.playTime + cmd.keepTime) {
                    maxTime = cmd.playTime + cmd.keepTime;
                }
            }, this);
        }, this);

        return maxTime;
    }

    // 获得爆炸次数， 同一个时间算一个
    getStep(effectsQueue: Command[]): number {
        if (!effectsQueue) return 0;

        return effectsQueue.reduce((maxValue, efffectCmd) => {
            return Math.max(maxValue, efffectCmd.step || 0);
        }, 0);
    }

    // 一段时间内禁止操作
    disableTouch(time: number, step: number) {
        if (time <= 0) return;
        
        this.isInPlayAni = true;
        this.node.runAction(
            cc.sequence(
                cc.delayTime(time),
                cc.callFunc(() => {
                    this.isInPlayAni = false;
                    this.audioUtils.playContinuousMatch(step);
                }, this)
            )
        );
    }

    // 正常击中格子后的操作
    selectCell(cellPos: cc.Vec2): CellModel[] {
        let result = this.controller.selectCell(cellPos); // 直接先丢给model处理数据逻辑
        const [changeModels, effectsQueue] = result; // 有改变的cell，包含新生成的cell和生成马上摧毁的格子
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
    }

    playEffect(effectsQueue: Command[]) {
        this.effectLayer.getComponent(EffectLayer).playEffects(effectsQueue);
    }
}
