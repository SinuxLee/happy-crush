/**
 * 合并
 * @param rowPoints
 * @param colPoints
 */
export function mergePointArray(rowPoints: cc.Vec2[], colPoints: cc.Vec2[]) {
    let result = rowPoints.concat();
    colPoints = colPoints.filter((colEle) => {
        let repeat = false;
        result.forEach((rowEle) => {
            if (colEle.equals(rowEle)) {
                repeat = true;
            }
        }, this);
        return !repeat;
    }, this);
    result.push(...colPoints);
    return result;
}

/**
 * 减法
 * @param points
 * @param exclusivePoint
 */
export function exclusivePoint(points: cc.Vec2[], exclusivePoint: cc.Vec2) {
    const result = new Array<cc.Vec2>();
    for (const point of points) {
        if (!point.equals(exclusivePoint)) {
            result.push(point);
        }
    }
    return result;
}
