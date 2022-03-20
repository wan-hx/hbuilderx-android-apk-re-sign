const hx = require("hbuilderx");

const reSign = require('./main.js')

function activate(context) {

    let AndroidApkSign = hx.commands.registerCommand('AndroidApkSign.main', (param) => {
        let sign = new reSign(param);
        sign.main()
    });
    context.subscriptions.push(AndroidApkSign);
};

function deactivate() {

};

module.exports = {
    activate,
    deactivate
}
