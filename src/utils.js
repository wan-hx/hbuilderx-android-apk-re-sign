const fs = require('fs');
const path = require('path');
const hx = require('hbuilderx');
const { spawn, exec } = require('child_process');

const os = require('os');
const osName = os.platform();

let USERHOME = osName == 'darwin' ?
    process.env.HOME :
    path.join(process.env.HOMEDRIVE, process.env.HOMEPATH);


/**
 * @description 获取jarsigner命令
 */
function getJarsigner() {
    let cmd = osName == "win32" ? "where jarsigner" : "which jarsigner";
    return new Promise((resolve, reject) => {
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                createOutputView("未查找到jarsigner相关工具，请在当前电脑安装JDK。如果当前电脑已安装JDK，请确保已将JDK安装路径加入到环境变量中。", "error");
                createOutputView("当然，您可以在HBuilderX 【设置 - 插件配置】中，手动配置jarsigner路径。", "info");
                createOutputView("Oracle JDK下载地址：https://www.oracle.com/java/technologies/downloads/", "info");
                reject('error');
            };
            resolve('success');
        });
    }).catch( error => {
        return 'error';
    })
};

/**
 * @description 获取apksigner命令
 */
function getApkSigner() {
    let cmd = osName == "win32" ? "where apksigner" : "which apksigner";
    return new Promise((resolve, reject) => {
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                createOutputView("未查找到apksigner相关工具，请确保当前电脑已安装配置Android SDK, 并加入到环境变量中。apksigner在Android SDK下的build-tools目录下。", "error");
                createOutputView("当然，您可以在HBuilderX 【设置 - 插件配置】中，手动配置apksigner路径。", "info");
                createOutputView("Android SDK下载地址：https://www.androiddevtools.cn", "info");
                reject('error');
            };
            resolve('success');
        })
    }).catch( error => {
        return 'error';
    });
};


// 执行cmd命令
function runCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                createOutputView(`命令执行错误：\n${error}`, 'error');
                reject(error);
            };
            if (stdout) {
                createOutputView(`命令执行详情：\n${stdout}`, 'info');
            };
            resolve(stdout);
        });
    }).catch((error) => {
        console.error(error);
    });
};


/**
 * @description 创建输出控制台, 支持文件链接跳转
 * @param {String} msg
 * @param {String} msgLevel (warning | success | error | info), 控制文本颜色
 * @param {String} linkText 链接文本
 */
function createOutputView(msg, msgLevel = 'info', linkText) {
    let outputView = hx.window.createOutputView({ "id": "Android-Apk", "title": "Android-Apk" });
    outputView.show();

    if (linkText == undefined || linkText == '') {
        outputView.appendLine({
            line: msg,
            level: msgLevel,
        });
        return;
    };

    let start;
    if (msg.includes(linkText) && linkText != undefined) {
        start = msg.indexOf(linkText);
    };

    outputView.appendLine({
        line: msg,
        level: msgLevel,
        hyperlinks: [
            {
                linkPosition: {
                    start: start,
                    end: start + linkText.length
                },
                onOpen: function () {}
            }
        ]
    });
};

/**
 * @desc 获取配置
 * @param item 配置项 - 必须为路径
 */
async function getPluginsConfig(item) {
    let config = await hx.workspace.getConfiguration();
    let result = config.get(item);
    if (fs.existsSync(result)) {
        return result;
    } else {
        return false;
    };
};

module.exports = {
    runCmd,
    createOutputView,
    getJarsigner,
    getApkSigner,
    getPluginsConfig
}
