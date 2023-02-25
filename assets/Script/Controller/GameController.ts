import GameModel from '../Model/GameModel';
import GridView from '../View/GridView';
const { ccclass, property } = cc._decorator;

@ccclass
export default class extends cc.Component {
    @property(cc.Node)
    private grid: cc.Node = null;

    private gameModel: GameModel = null;

    onLoad() {
        this.gameModel = new GameModel(6); // 设置出现的动物种类，至少3个动物。

        const gridScript = this.grid.getComponent(GridView);
        gridScript.setController(this);
        gridScript.initWithCellModels(this.gameModel.getCells());
    }

    selectCell(pos: cc.Vec2) {
        return this.gameModel.selectCell(pos);
    }

    cleanCmd() {
        this.gameModel.cleanCmd();
    }
}
