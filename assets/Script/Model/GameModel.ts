import CellModel from './CellModel';
import { mergePointArray, exclusivePoint } from '../Utils/ModelUtils';
import {
    CELL_TYPE,
    CELL_BASENUM,
    CELL_STATUS,
    GRID_WIDTH,
    GRID_HEIGHT,
    ANITIME,
} from './ConstValue';

export default class GameModel {
    private cells: Array<Array<CellModel>> = null;
    private cellBgs = null;
    private lastPos:cc.Vec2 = cc.v2(-1, -1);
    private cellTypeNum: number = 5;
    private cellCreateType = []; // 升成种类只在这个数组里面查找

    init(cellTypeNum) {
        this.cells = [];
        this.setCellTypeNum(cellTypeNum || this.cellTypeNum);
        for (let i = 1; i <= GRID_WIDTH; i++) {
            this.cells[i] = [];
            for (let j = 1; j <= GRID_HEIGHT; j++) {
                this.cells[i][j] = new CellModel();
            }
        }

        for (let i = 1; i <= GRID_WIDTH; i++) {
            for (let j = 1; j <= GRID_HEIGHT; j++) {
                //已经被mock数据生成了
                if (this.cells[i][j].type != null) {
                    continue;
                }
                let flag = true;
                while (flag) {
                    flag = false;

                    this.cells[i][j].init(this.getRandomCellType());
                    let result = this.checkPoint(j, i)[0];
                    if (result.length > 2) {
                        flag = true;
                    }
                    this.cells[i][j].setXY(j, i);
                    this.cells[i][j].setStartXY(j, i);
                }
            }
        }
    }

    mock() {
        this.mockInit(5, 1, CELL_TYPE.A);
        this.mockInit(5, 3, CELL_TYPE.A);
        this.mockInit(4, 2, CELL_TYPE.A);
        this.mockInit(3, 2, CELL_TYPE.A);
        this.mockInit(5, 2, CELL_TYPE.B);
        this.mockInit(6, 2, CELL_TYPE.B);
        this.mockInit(7, 3, CELL_TYPE.B);
        this.mockInit(8, 2, CELL_TYPE.A);
    }
    mockInit(x, y, type) {
        this.cells[x][y].init(type);
        this.cells[x][y].setXY(y, x);
        this.cells[x][y].setStartXY(y, x);
    }

    /**
     *
     * @param x
     * @param y
     * @param recursive 是否递归查找
     * @returns {([]|string|*)[]}
     */
    checkPoint(x: number, y: number, recursive: boolean = false) {
        let rowResult = this.checkWithDirection(x, y, [
            cc.v2(1, 0),
            cc.v2(-1, 0),
        ]);
        let colResult = this.checkWithDirection(x, y, [
            cc.v2(0, -1),
            cc.v2(0, 1),
        ]);
        let samePoints = [];
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
        if (rowResult.length >= 3) {
            samePoints = rowResult;
        }
        if (colResult.length >= 3) {
            samePoints = mergePointArray(samePoints, colResult);
        }
        let result = [
            samePoints,
            newCellStatus,
            this.cells[y][x].type,
            cc.v2(x, y),
        ];
        // 检查一下消除的其他节点， 能不能生成更大范围的消除
        if (recursive && result.length >= 3) {
            let subCheckPoints = exclusivePoint(samePoints, cc.v2(x, y));
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

    checkWithDirection(x, y, direction) {
        let queue = [];
        let vis = [];
        vis[x + y * 9] = true;
        queue.push(cc.v2(x, y));
        let front = 0;
        while (front < queue.length) {
            //let direction = [cc.v2(0, -1), cc.v2(0, 1), cc.v2(1, 0), cc.v2(-1, 0)];
            let point = queue[front];
            let cellModel = this.cells[point.y][point.x];
            front++;
            if (!cellModel) {
                continue;
            }
            for (let i = 0; i < direction.length; i++) {
                let tmpX = point.x + direction[i].x;
                let tmpY = point.y + direction[i].y;
                if (
                    tmpX < 1 ||
                    tmpX > 9 ||
                    tmpY < 1 ||
                    tmpY > 9 ||
                    vis[tmpX + tmpY * 9] ||
                    !this.cells[tmpY][tmpX]
                ) {
                    continue;
                }
                if (cellModel.type === this.cells[tmpY][tmpX].type) {
                    vis[tmpX + tmpY * 9] = true;
                    queue.push(cc.v2(tmpX, tmpY));
                }
            }
        }
        return queue;
    }

    printInfo() {
        for (let i = 1; i <= 9; i++) {
            let printStr = '';
            for (let j = 1; j <= 9; j++) {
                printStr += this.cells[i][j].type + ' ';
            }
            console.log(printStr);
        }
    }

    getCells() {
        return this.cells;
    }
    // controller调用的主要入口
    // 点击某个格子
    selectCell(pos) {
        this.changeModels = []; // 发生改变的model，将作为返回值，给view播动作
        this.effectsQueue = []; // 动物消失，爆炸等特效
        let lastPos = this.lastPos;
        let delta = Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y);
        if (delta != 1) {
            //非相邻格子， 直接返回
            this.lastPos = pos;
            return [[], []];
        }
        let curClickCell = this.cells[pos.y][pos.x]; //当前点击的格子
        let lastClickCell = this.cells[lastPos.y][lastPos.x]; // 上一次点击的格式
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
            return [this.changeModels];
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
    processCrush(checkPoint) {
        let cycleCount = 0;
        while (checkPoint.length > 0) {
            let bombModels = [];
            if (cycleCount == 0 && checkPoint.length == 2) {
                //特殊消除
                let pos1 = checkPoint[0];
                let pos2 = checkPoint[1];
                let model1 = this.cells[pos1.y][pos1.x];
                let model2 = this.cells[pos2.y][pos2.x];
                if (
                    model1.status == CELL_STATUS.BIRD ||
                    model2.status == CELL_STATUS.BIRD
                ) {
                    let bombModel = null;
                    if (model1.status == CELL_STATUS.BIRD) {
                        model1.type = model2.type;
                        bombModels.push(model1);
                    } else {
                        model2.type = model1.type;
                        bombModels.push(model2);
                    }
                }
            }
            for (let i in checkPoint) {
                let pos = checkPoint[i];
                if (!this.cells[pos.y][pos.x]) {
                    continue;
                }
                let [result, newCellStatus, newCellType, crushPoint] =
                    this.checkPoint(pos.x, pos.y, true);

                if (result.length < 3) {
                    continue;
                }
                for (let j in result) {
                    let model = this.cells[result[j].y][result[j].x];
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

    //生成新cell
    createNewCell(pos, status, type) {
        if (status == '') {
            return;
        }
        if (status == CELL_STATUS.BIRD) {
            type = CELL_TYPE.BIRD;
        }
        let model = new CellModel();
        this.cells[pos.y][pos.x] = model;
        model.init(type);
        model.setStartXY(pos.x, pos.y);
        model.setXY(pos.x, pos.y);
        model.setStatus(status);
        model.setVisible(0, false);
        model.setVisible(this.curTime, true);
        this.changeModels.push(model);
    }
    // 下落
    down() {
        let newCheckPoint = [];
        for (let i = 1; i <= GRID_WIDTH; i++) {
            for (let j = 1; j <= GRID_HEIGHT; j++) {
                if (this.cells[i][j] == null) {
                    let curRow = i;
                    for (let k = curRow; k <= GRID_HEIGHT; k++) {
                        if (this.cells[k][j]) {
                            this.pushToChangeModels(this.cells[k][j]);
                            newCheckPoint.push(this.cells[k][j]);
                            this.cells[curRow][j] = this.cells[k][j];
                            this.cells[k][j] = null;
                            this.cells[curRow][j].setXY(j, curRow);
                            this.cells[curRow][j].moveTo(
                                cc.v2(j, curRow),
                                this.curTime
                            );
                            curRow++;
                        }
                    }
                    let count = 1;
                    for (let k = curRow; k <= GRID_HEIGHT; k++) {
                        this.cells[k][j] = new CellModel();
                        this.cells[k][j].init(this.getRandomCellType());
                        this.cells[k][j].setStartXY(j, count + GRID_HEIGHT);
                        this.cells[k][j].setXY(j, count + GRID_HEIGHT);
                        this.cells[k][j].moveTo(cc.v2(j, k), this.curTime);
                        count++;
                        this.changeModels.push(this.cells[k][j]);
                        newCheckPoint.push(this.cells[k][j]);
                    }
                }
            }
        }
        this.curTime += ANITIME.TOUCH_MOVE + 0.3;
        return newCheckPoint;
    }

    pushToChangeModels(model) {
        if (this.changeModels.indexOf(model) != -1) {
            return;
        }
        this.changeModels.push(model);
    }

    cleanCmd() {
        for (let i = 1; i <= GRID_WIDTH; i++) {
            for (let j = 1; j <= GRID_HEIGHT; j++) {
                if (this.cells[i][j]) {
                    this.cells[i][j].cmd = [];
                }
            }
        }
    }

    exchangeCell(pos1, pos2) {
        let tmpModel = this.cells[pos1.y][pos1.x];
        this.cells[pos1.y][pos1.x] = this.cells[pos2.y][pos2.x];
        this.cells[pos1.y][pos1.x].x = pos1.x;
        this.cells[pos1.y][pos1.x].y = pos1.y;
        this.cells[pos2.y][pos2.x] = tmpModel;
        this.cells[pos2.y][pos2.x].x = pos2.x;
        this.cells[pos2.y][pos2.x].y = pos2.y;
    }
    // 设置种类
    // Todo 改成乱序算法
    setCellTypeNum(num) {
        console.log('num = ', num);
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
    // 随要生成一个类型
    getRandomCellType() {
        let index = Math.floor(Math.random() * this.cellTypeNum);
        return this.cellCreateType[index];
    }
    // TODO bombModels去重
    processBomb(bombModels, cycleCount) {
        while (bombModels.length > 0) {
            let newBombModel = [];
            let bombTime = ANITIME.BOMB_DELAY;
            bombModels.forEach(function (model) {
                if (model.status == CELL_STATUS.LINE) {
                    for (let i = 1; i <= GRID_WIDTH; i++) {
                        if (this.cells[model.y][i]) {
                            if (
                                this.cells[model.y][i].status !=
                                CELL_STATUS.COMMON
                            ) {
                                newBombModel.push(this.cells[model.y][i]);
                            }
                            this.crushCell(i, model.y, false, cycleCount);
                        }
                    }
                    this.addRowBomb(this.curTime, cc.v2(model.x, model.y));
                } else if (model.status == CELL_STATUS.COLUMN) {
                    for (let i = 1; i <= GRID_HEIGHT; i++) {
                        if (this.cells[i][model.x]) {
                            if (
                                this.cells[i][model.x].status !=
                                CELL_STATUS.COMMON
                            ) {
                                newBombModel.push(this.cells[i][model.x]);
                            }
                            this.crushCell(model.x, i, false, cycleCount);
                        }
                    }
                    this.addColBomb(this.curTime, cc.v2(model.x, model.y));
                } else if (model.status == CELL_STATUS.WRAP) {
                    let x = model.x;
                    let y = model.y;
                    for (let i = 1; i <= GRID_HEIGHT; i++) {
                        for (let j = 1; j <= GRID_WIDTH; j++) {
                            let delta = Math.abs(x - j) + Math.abs(y - i);
                            if (this.cells[i][j] && delta <= 2) {
                                if (
                                    this.cells[i][j].status !=
                                    CELL_STATUS.COMMON
                                ) {
                                    newBombModel.push(this.cells[i][j]);
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
                    for (let i = 1; i <= GRID_HEIGHT; i++) {
                        for (let j = 1; j <= GRID_WIDTH; j++) {
                            if (
                                this.cells[i][j] &&
                                this.cells[i][j].type == crushType
                            ) {
                                if (
                                    this.cells[i][j].status !=
                                    CELL_STATUS.COMMON
                                ) {
                                    newBombModel.push(this.cells[i][j]);
                                }
                                this.crushCell(j, i, true, cycleCount);
                            }
                        }
                    }
                    //this.crushCell(model.x, model.y);
                }
            }, this);
            if (bombModels.length > 0) {
                this.curTime += bombTime;
            }
            bombModels = newBombModel;
        }
    }
    /**
     *
     * @param {开始播放的时间} playTime
     * @param {*cell位置} pos
     * @param {*第几次消除，用于播放音效} step
     */
    addCrushEffect(playTime, pos, step) {
        this.effectsQueue.push({
            playTime,
            pos,
            action: 'crush',
            step,
        });
    }

    addRowBomb(playTime, pos) {
        this.effectsQueue.push({
            playTime,
            pos,
            action: 'rowBomb',
        });
    }

    addColBomb(playTime, pos) {
        this.effectsQueue.push({
            playTime,
            pos,
            action: 'colBomb',
        });
    }

    addWrapBomb(playTime, pos) {
        // TODO
    }
    // cell消除逻辑
    crushCell(x, y, needShake, step) {
        let model = this.cells[y][x];
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
        this.cells[y][x] = null;
    }
}
