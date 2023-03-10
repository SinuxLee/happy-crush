export enum CELL_TYPE {
    EMPTY = 0,
    A = 1,
    B = 2,
    C = 3,
    D = 4,
    E = 5,
    F = 6,
    BIRD = 7,
}

export const CELL_BASENUM = 6;
export const CELL_STATUS = Object.freeze({
    COMMON: 'common',
    CLICK: 'click',
    LINE: 'line',
    COLUMN: 'column',
    WRAP: 'wrap',
    BIRD: 'bird',
});

export const GRID_COL = 9;
export const GRID_ROW = 9;

export const CELL_WIDTH = 70;
export const CELL_HEIGHT = 70;

export const GRID_PIXEL_WIDTH = GRID_COL * CELL_WIDTH;
export const GRID_PIXEL_HEIGHT = GRID_ROW * CELL_HEIGHT;

// ********************   时间表  animation time **************************
export const ANITIME = Object.freeze({
    TOUCH_MOVE: 0.3,
    DIE: 0.2,
    DOWN: 0.5,
    BOMB_DELAY: 0.3,
    BOMB_BIRD_DELAY: 0.7,
    DIE_SHAKE: 0.4, // 死前抖动
});
