const { ccclass, property } = cc._decorator;

namespace gg{
    /**
     * 提取一些方法
     */
    export class Script extends cc.Component{
        getChildButton(name: string):cc.Button{
            return this.getChildComponent(name, cc.Button)
        }
    
        getChildProgressBar(name: string): cc.ProgressBar{
            return this.getChildComponent(name,cc.ProgressBar)
        }
    
        getChildComponent<T extends cc.Component>(name:string, type: {prototype: T}): T{
            return this.getChild(name)?.getComponent(type)
        }
    
        getChild(name:string):cc.Node{
            return this.node.getChildByName(name)
        }
    }
}

@ccclass
export default class extends gg.Script {
    @property(cc.AudioClip)
    private worldSceneBGM: cc.AudioClip = null;

    private gameSceneBGMAudioId: number = 0;
    private loginButton: cc.Node = null;
    private loadingBar: cc.ProgressBar = null;

    onLoad() {
        this.gameSceneBGMAudioId = cc.audioEngine.play(this.worldSceneBGM, true, 1);
        this.loadingBar = this.getChildProgressBar('loadingProgress')
        
        this.loginButton = this.getChild('loginButton')
        this.loginButton.on(cc.Node.EventType.TOUCH_END,()=>this.onLogin())
    }

    onLogin() {
        this.loadingBar.node.active = true;
        this.loadingBar.progress = 0;
        this.loginButton.active = false;

        const sceneName = 'Game'
        cc.director.preloadScene(
            sceneName,
            (completed: number, total: number) => {
                const percent = Math.round(completed/total*100)/100
                this.loadingBar.progress = (percent > this.loadingBar.progress) ? percent : this.loadingBar.progress
            },
            (err: Error) => {
                if (err) return cc.log(`failed to loadScene: ${err.message}`);

                this.loadingBar.node.active = false;
                cc.director.loadScene(sceneName);
            }
        );
    }

    onDestroy() {
        cc.audioEngine.stop(this.gameSceneBGMAudioId);
    }
}
