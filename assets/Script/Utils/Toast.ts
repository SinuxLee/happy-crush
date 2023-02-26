const defOpt = Object.freeze({
    gravity: "CENTER",
    duration: 1,
    bg_color: cc.color(102, 102, 102, 200)
})

// 一个简单的tost组件，用法：
// import {Toast} from 'Toast'
// Toast(text,{gravity,duration,bg_color})
// text:要显示的字符串
// gravity(可选):位置，String类型，可选值('CENTER','TOP','BOTTOM'),默认为'CENTER'
// duration(可选):时间，Number类型，单位为秒，默认1s
// bg_color(可选):颜色，cc.color类型，默认cc.color(102, 102, 102, 200)
export function Toast(text = "",opt=defOpt) {
    opt = Object.assign({},defOpt,opt)

    const canvas = cc.director.getScene().getComponentInChildren(cc.Canvas);
    const {width,height} = canvas.node;
    const bgNode = new cc.Node();

    // Lable文本格式设置
    const textNode = new cc.Node();
    const textLabel = textNode.addComponent(cc.Label);
    textLabel.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
    textLabel.verticalAlign = cc.Label.VerticalAlign.CENTER;
    textLabel.fontSize = 30;
    textLabel.string = text;

    // 当文本宽度过长时，设置为自动换行格式
    if (text.length * textLabel.fontSize > (width * 3) / 5) {
        textNode.width = (width * 3) / 5;
        textLabel.overflow = cc.Label.Overflow.RESIZE_HEIGHT;
    } else {
        textNode.width = text.length * textLabel.fontSize;
    }

    // ~~ 跟 |0 效果一样
    const lineCount = ~~((text.length * textLabel.fontSize) / ((width * 3) / 5)) + 1;
    textNode.height = textLabel.fontSize * lineCount;

    // 背景设置
    const ctx = bgNode.addComponent(cc.Graphics);
    ctx.arc(
        -textNode.width / 2,
        0,
        textNode.height / 2 + 20,
        0.5 * Math.PI,
        1.5 * Math.PI,
        true
    );
    ctx.lineTo(textNode.width / 2, -(textNode.height / 2 + 20));
    ctx.arc(
        textNode.width / 2,
        0,
        textNode.height / 2 + 20,
        1.5 * Math.PI,
        0.5 * Math.PI,
        true
    );
    ctx.lineTo(-textNode.width / 2, textNode.height / 2 + 20);
    ctx.fillColor = opt.bg_color;
    ctx.fill();

    bgNode.addChild(textNode);

    // gravity 设置Toast显示的位置
    if (opt.gravity === "CENTER") {
        bgNode.y = bgNode.x = 0;
    } else if (opt.gravity === "TOP") {
        bgNode.y = bgNode.y + (height / 5) * 2;
    } else if (opt.gravity === "BOTTOM") {
        bgNode.y = bgNode.y - (height / 5) * 2;
    }

    canvas.node.addChild(bgNode);

    let finished = cc.callFunc(function() {
        bgNode.destroy();
    });
    let action = cc.sequence(
        cc.moveBy(opt.duration, cc.v2(0, 0)),
        cc.fadeOut(0.3),
        finished
    );
    bgNode.runAction(action);
}