import CellModel from './CellModel';
import {
    CELL_TYPE,
    CELL_BASENUM,
    CELL_STATUS,
    GRID_COL,
    GRID_ROW,
    ANITIME,
} from './ConstValue';
import { Command } from '../View/EffectLayer';

export default class GameModel {
    private readonly _rowPin = [cc.v2(1, 0),cc.v2(-1, 0)]
    private readonly _colPin = [cc.v2(0, -1),cc.v2(0, 1)]

    private _cells: CellModel[][] = [null];
    private lastPos: cc.Vec2 = cc.v2(-1, -1);
    private cellTypeNum: number = 0; // 动物种类总数
    private cellCreateType = []; // 生成种类只在这个数组里面查找
    private curTime = 0;
    private changeModels: CellModel[];
    private effectsQueue: Command[];

    get cells(): CellModel[][] {
        return this._cells;
    }

    constructor(cellTypeNum: number = 3) {
        if(cellTypeNum < 3) cellTypeNum = 3;

        this.setCellTypeNum(cellTypeNum);
        for (let i = 1; i <= GRID_ROW; i++) {
            const row: CellModel[] = [null]
            this._cells.push(row)
            for (let j = 1; j <= GRID_COL; j++) {
                row.push(new CellModel())
            }
        }

        for (let i = 1; i <= GRID_ROW; i++) {
            for (let j = 1; j <= GRID_COL; j++) {
                const cell = this._cells[i][j]
                if (cell.type > 0) continue;

                while(true){
                    cell.init(this.getRandomCellType());
                    cell.setXY(j, i);
                    cell.setStartXY(j, i);

                    let result = this.checkPoint(j, i)[0];
                    if(result.length <= 2) break; // 大于 2 说明开局就有合并/消除
                }
            }
        }
    }

    /**
     * 检查当前点合并/消除后的形态
     * @param x
     * @param y
     * @param recursive 是否递归查找
     * @returns {([]|string|*)[]}
     */
    checkPoint(x: number,y: number,recursive: boolean = false): typeof result {
        // 能与当前节点连起来的行或者列
        const rowResult = this.checkWithDirection(x, y, this._rowPin);
        const colResult = this.checkWithDirection(x, y, this._colPin);

        let samePoints: cc.Vec2[] = [];
        let newCellStatus = '';
        if (rowResult.length >= 5 || colResult.length >= 5) {
            newCellStatus = CELL_STATUS.BIRD;
        } else if (rowResult.length >= 3 && colResult.length >= 3) {
            newCellStatus = CELL_STATUS.WRAP;
        } else if (rowResult.length >= 4) {
            newCellStatus = CELL_STATUS.LINE;
        } else if (colResult.length >= 4) {
            newCellStatus = CELL_STATUS.COLUMN;
        }

        // 记录即将消失的节点
        if (rowResult.length >= 3) {
            samePoints = rowResult;
        }
        if (colResult.length >= 3) {
            samePoints = [...samePoints, ...colResult].filter((obj, index, self) => {
                return index === self.findIndex((o) => o.equals(obj));
            })
        }

        let result: [cc.Vec2[], string, number, cc.Vec2] = [
            samePoints,    // 可以被消除/合并的节点
            newCellStatus, // 当前节点新状态
            this._cells[y][x].type,
            cc.v2(x, y),
        ];

        // 检查一下消除的其他节点， 能不能生成更大范围的消除
        if (recursive && result.length >= 3) {
            const exclusivePoint = cc.v2(x, y)
            const subCheckPoints = new Array<cc.Vec2>();
            for (const point of samePoints) {
                if (!point.equals(exclusivePoint)) {
                    subCheckPoints.push(point);
                }
            }

            for (let point of subCheckPoints) {
                let subResult = this.checkPoint(point.x, point.y, false);
                if (
                    subResult[1] > result[1] ||
                    (subResult[1] === result[1] &&
                        subResult[0].length > result[0].length)
                ) {
                    result = subResult;
                }
            }
        }
        return result;
    }

    /**
     * 检查当前节点周边能连起来的格子
     * @param x 
     * @param y 
     * @param direction 
     * @returns 可以连接的点坐标数组
     */
    checkWithDirection(x: number, y: number, direction: cc.Vec2[]): cc.Vec2[] {
        const queue: cc.Vec2[] = [];
        queue.push(cc.v2(x, y));

        const visted = new Set<number>()
        visted.add(x + y * 9) // 当前节点加入已访问集合
        
        // 判断被搜索的点是否合法
        const isValid = (next:cc.Vec2):boolean =>{
            if(next.x <= 0 || next.x > GRID_COL) return false
            if(next.y <=0 || next.y > GRID_ROW) return false
            if(visted.has(next.x + next.y * 9)) return false
            if(!this._cells[next.y][next.x]) return false

            return true
        }

        let idx = 0;
        while (idx < queue.length) {
            const current = queue[idx++];
            const cellModel = this._cells[current.y][current.x];
            if (!cellModel) continue;

            // 当前节点为原点，按照坐标方向搜索
            for (const dir of direction) {
                const next = current.add(dir)
                if (!isValid(next)) continue;
                visted.add(next.x + next.y * 9); // 已访问的节点不再访问

                const cell = this._cells[next.y][next.x]
                if (cellModel.type !== cell.type) continue
                queue.push(next);
            }
        }
        return queue;
    }

    printInfo() {
        for (let i = 1; i <= GRID_ROW; i++) {
            let printStr = '';
            for (let j = 1; j <= GRID_COL; j++) {
                printStr += this._cells[i][j].type + ' ';
            }
            console.log(printStr);
        }
    }

    // controller调用的主要入口
    // 点击某个格子
    selectCell(pos: cc.Vec2): [CellModel[], Command[] | null] {
        this.changeModels = []; // 发生改变的model，将作为返回值，给view播动作
        this.effectsQueue = []; // 动物消失，爆炸等特效
        let lastPos = this.lastPos;
        let delta = Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y);
        if (delta != 1) {
            //非相邻格子， 直接返回
            this.lastPos = pos;
            return [[], []];
        }

        let curClickCell = this._cells[pos.y][pos.x]; // 当前点击的格子
        let lastClickCell = this._cells[lastPos.y][lastPos.x]; // 上一次点击的格子
        this.exchangeCell(lastPos, pos);
        let result1 = this.checkPoint(pos.x, pos.y)[0];
        let result2 = this.checkPoint(lastPos.x, lastPos.y)[0];
        this.curTime = 0; // 动画播放的当前时间
        this.pushToChangeModels(curClickCell);
        this.pushToChangeModels(lastClickCell);
        let isCanBomb =
            (curClickCell.status != CELL_STATUS.COMMON && // 判断两个是否是特殊的动物
                lastClickCell.status != CELL_STATUS.COMMON) ||
            curClickCell.status == CELL_STATUS.BIRD ||
            lastClickCell.status == CELL_STATUS.BIRD;
        
        if (result1.length < 3 && result2.length < 3 && !isCanBomb) {
            //不会发生消除的情况
            this.exchangeCell(lastPos, pos);
            curClickCell.moveToAndBack(lastPos);
            lastClickCell.moveToAndBack(pos);
            this.lastPos = cc.v2(-1, -1);
            return [this.changeModels, null];
        } else {
            this.lastPos = cc.v2(-1, -1);
            curClickCell.moveTo(lastPos, this.curTime);
            lastClickCell.moveTo(pos, this.curTime);
            let checkPoint = [pos, lastPos];
            this.curTime += ANITIME.TOUCH_MOVE;
            this.processCrush(checkPoint);
            return [this.changeModels, this.effectsQueue];
        }
    }

    // 消除
    processCrush(checkPoint: cc.Vec2[] | CellModel[]) {
        let cycleCount = 0;
        while (checkPoint.length > 0) {
            let bombModels: CellModel[] = [];
            if (cycleCount == 0 && checkPoint.length == 2) {
                // 特殊消除
                const [pos1,pos2] = (checkPoint as cc.Vec2[]);
                const model1 = this.getCell(pos1);
                const model2 = this.getCell(pos2);

                cc.log(model1.status, model2.status)
                if ( model1.status == CELL_STATUS.BIRD ||
                    model2.status == CELL_STATUS.BIRD) {
                    if (model1.status == CELL_STATUS.BIRD) {
                        model1.type = model2.type;
                        bombModels.push(model1);
                    } else {
                        model2.type = model1.type;
                        bombModels.push(model2);
                    }
                }else if(model1.status != CELL_STATUS.COMMON && 
                    model2.status != CELL_STATUS.COMMON){
                    bombModels.push(model1);
                    if(model1.status !== model2.status) bombModels.push(model2);
                }
            }

            for (let i in checkPoint) {
                let pos = checkPoint[i];
                if (!this._cells[pos.y][pos.x]) continue;

                let [result, newCellStatus, newCellType, crushPoint] =
                    this.checkPoint(pos.x, pos.y, true);

                if (result.length < 3) continue;
                
                for (let j in result) {
                    let model = this._cells[result[j].y][result[j].x];
                    this.crushCell(result[j].x, result[j].y, false, cycleCount);
                    if (model.status != CELL_STATUS.COMMON) {
                        bombModels.push(model);
                    }
                }
                this.createNewCell(crushPoint, newCellStatus, newCellType);
            }
            this.processBomb(bombModels, cycleCount);
            this.curTime += ANITIME.DIE;
            checkPoint = this.down();
            cycleCount++;
        }
    }

    // 生成新cell
    createNewCell(pos: cc.Vec2, status: string, type: number) {
        if (status == '') return;
        if (status == CELL_STATUS.BIRD) type = CELL_TYPE.BIRD;

        let model = new CellModel();
        this._cells[pos.y][pos.x] = model;
        model.init(type);
        model.setStartXY(pos.x, pos.y);
        model.setXY(pos.x, pos.y);
        model.setStatus(status);
        model.setVisible(0, false);
        model.setVisible(this.curTime, true);
        this.changeModels.push(model);
    }

    // 下落
    down(): CellModel[] {
        let newCheckPoint: CellModel[] = [];
        for (let i = 1; i <= GRID_COL; i++) {
            for (let j = 1; j <= GRID_ROW; j++) {
                if (this._cells[i][j] == null) {
                    let curRow = i;
                    for (let k = curRow; k <= GRID_ROW; k++) {
                        if (this._cells[k][j]) {
                            this.pushToChangeModels(this._cells[k][j]);
                            newCheckPoint.push(this._cells[k][j]);
                            this._cells[curRow][j] = this._cells[k][j];
                            this._cells[k][j] = null;
                            this._cells[curRow][j].setXY(j, curRow);
                            this._cells[curRow][j].moveTo(
                                cc.v2(j, curRow),
                                this.curTime
                            );
                            curRow++;
                        }
                    }
                    let count = 1;
                    for (let k = curRow; k <= GRID_ROW; k++) {
                        this._cells[k][j] = new CellModel();
                        this._cells[k][j].init(this.getRandomCellType());
                        this._cells[k][j].setStartXY(j, count + GRID_ROW);
                        this._cells[k][j].setXY(j, count + GRID_ROW);
                        this._cells[k][j].moveTo(cc.v2(j, k), this.curTime);
                        count++;
                        this.changeModels.push(this._cells[k][j]);
                        newCheckPoint.push(this._cells[k][j]);
                    }
                }
            }
        }
        this.curTime += ANITIME.TOUCH_MOVE + 0.3;
        return newCheckPoint;
    }

    pushToChangeModels(model: CellModel) {
        if (this.changeModels.indexOf(model) != -1) {
            return;
        }
        this.changeModels.push(model);
    }

    cleanCmd(): void {
        for (let i = 1; i <= GRID_COL; i++) {
            for (let j = 1; j <= GRID_ROW; j++) {
                if (this._cells[i][j]) {
                    this._cells[i][j].cmd = [];
                }
            }
        }
    }

    getCell(pos: cc.Vec2): CellModel{
        return this._cells[pos.y][pos.x];
    }

    setCell(pos: cc.Vec2, cell: CellModel){
        cell.x = pos.x;cell.y = pos.y;
        this._cells[pos.y][pos.x] = cell
    }

    exchangeCell(pos1: cc.Vec2, pos2: cc.Vec2) {
        const tmp = this.getCell(pos2);
        this.setCell(pos2,this.getCell(pos1))
        this.setCell(pos1,tmp)
    }

    // 设置种类
    // Todo 改成乱序算法
    setCellTypeNum(num: number) {
        this.cellTypeNum = num;
        this.cellCreateType = [];
        let createTypeList = this.cellCreateType;
        for (let i = 1; i <= CELL_BASENUM; i++) {
            createTypeList.push(i);
        }
        for (let i = 0; i < createTypeList.length; i++) {
            let index = Math.floor(Math.random() * (CELL_BASENUM - i)) + i;
            createTypeList[i],
                (createTypeList[index] = createTypeList[index]),
                createTypeList[i];
        }
    }

    // 随机生成一个类型
    getRandomCellType() {
        let index = Math.floor(Math.random() * this.cellTypeNum);
        return this.cellCreateType[index];
    }

    // TODO bombModels去重
    processBomb(bombModels: CellModel[], cycleCount: number) {
        while (bombModels.length > 0) {
            let newBombModel = [];
            let bombTime: number = ANITIME.BOMB_DELAY;
            bombModels.forEach((model: CellModel) => {
                if (model.status == CELL_STATUS.LINE) {
                    for (let i = 1; i <= GRID_COL; i++) {
                        if (this._cells[model.y][i]) {
                            if (
                                this._cells[model.y][i].status !=
                                CELL_STATUS.COMMON
                            ) {
                                newBombModel.push(this._cells[model.y][i]);
                            }
                            this.crushCell(i, model.y, false, cycleCount);
                        }
                    }
                    this.addRowBomb(this.curTime, cc.v2(model.x, model.y));
                } else if (model.status == CELL_STATUS.COLUMN) {
                    for (let i = 1; i <= GRID_ROW; i++) {
                        if (this._cells[i][model.x]) {
                            if (
                                this._cells[i][model.x].status !=
                                CELL_STATUS.COMMON
                            ) {
                                newBombModel.push(this._cells[i][model.x]);
                            }
                            this.crushCell(model.x, i, false, cycleCount);
                        }
                    }
                    this.addColBomb(this.curTime, cc.v2(model.x, model.y));
                } else if (model.status == CELL_STATUS.WRAP) {
                    let x = model.x;
                    let y = model.y;
                    for (let i = 1; i <= GRID_ROW; i++) {
                        for (let j = 1; j <= GRID_COL; j++) {
                            let delta = Math.abs(x - j) + Math.abs(y - i);
                            if (this._cells[i][j] && delta <= 2) {
                                if (
                                    this._cells[i][j].status !=
                                    CELL_STATUS.COMMON
                                ) {
                                    newBombModel.push(this._cells[i][j]);
                                }
                                this.crushCell(j, i, false, cycleCount);
                            }
                        }
                    }
                } else if (model.status == CELL_STATUS.BIRD) {
                    let crushType = model.type;
                    if (bombTime < ANITIME.BOMB_BIRD_DELAY) {
                        bombTime = ANITIME.BOMB_BIRD_DELAY;
                    }
                    if (crushType == CELL_TYPE.BIRD) {
                        crushType = this.getRandomCellType();
                    }
                    for (let i = 1; i <= GRID_ROW; i++) {
                        for (let j = 1; j <= GRID_COL; j++) {
                            if (
                                this._cells[i][j] &&
                                this._cells[i][j].type == crushType
                            ) {
                                if (
                                    this._cells[i][j].status !=
                                    CELL_STATUS.COMMON
                                ) {
                                    newBombModel.push(this._cells[i][j]);
                                }
                                this.crushCell(j, i, true, cycleCount);
                            }
                        }
                    }
                    //this.crushCell(model.x, model.y);
                }
            }, this);
            
            if (bombModels.length > 0) this.curTime += bombTime;
            bombModels = newBombModel;
        }
    }
    /**
     *
     * @param {setStartXY} playTime 开始播放的时间
     * @param {cc.Vec2} pos cell位置
     * @param {number} step 第几次消除，用于播放音效
     */
    addCrushEffect(playTime: number, pos: cc.Vec2, step: number) {
        this.effectsQueue.push({
            playTime,
            keepTime: 0,
            isVisible: false,
            pos,
            action: 'crush',
            step,
        });
    }

    addRowBomb(playTime: number, pos: cc.Vec2) {
        this.effectsQueue.push({
            playTime,
            pos,
            action: 'rowBomb',
            keepTime: 0,
            step: 0,
            isVisible: false,
        });
    }

    addColBomb(playTime: number, pos: cc.Vec2) {
        this.effectsQueue.push({
            playTime,
            pos,
            action: 'colBomb',
            keepTime: 0,
            step: 0,
            isVisible: false,
        });
    }

    // cell消除逻辑
    crushCell(x: number, y: number, needShake: boolean, step: number) {
        let model = this._cells[y][x];
        this.pushToChangeModels(model);
        if (needShake) {
            model.toShake(this.curTime);
        }

        let shakeTime = needShake ? ANITIME.DIE_SHAKE : 0;
        model.toDie(this.curTime + shakeTime);
        this.addCrushEffect(
            this.curTime + shakeTime,
            cc.v2(model.x, model.y),
            step
        );
        this._cells[y][x] = null;
    }
}
