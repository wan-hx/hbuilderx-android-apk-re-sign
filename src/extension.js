const hx = require("hbuilderx");

const reSign = require('./main.js')

function activate(context) {

    let AndroidApkReSign = hx.commands.registerCommand('AndroidApkReSign.main', (param) => {
        let sign = new reSign(param);
        sign.main()
    });
    context.subscriptions.push(AndroidApkReSign);
};

function deactivate() {

};

module.exports = {
    activate,
    deactivate
}
