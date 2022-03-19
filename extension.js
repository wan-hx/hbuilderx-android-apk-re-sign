const hx = require("hbuilderx");

const reSign = require('./src/main.js')

function activate(context) {
    
	let AndroidApkReSign = hx.commands.registerCommand('AndroidApkReSign.main', () => {
		let sign = new reSign();
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
