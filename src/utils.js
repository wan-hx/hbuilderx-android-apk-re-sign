const fs = require('fs');
const path = require('path');
const hx = require('hbuilderx');
const { spawn, exec } = require('child_process');

const os = require('os');
const osName = os.platform();

/**
 * @description 获取jarsigner命令
 */
function getJarsigner() {
    let cmd = osName == "win32" ? "where jarsigner" : "which jarsigner";
    return new Promise((resolve, reject) => {
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                createOutputView("Android签名，需要jarsigner工具。未查找到jarsigner相关工具，请在当前电脑安装JDK。如果当前电脑已安装JDK，请确保已将JDK安装路径加入到环境变量中。", "error");
                createOutputView("Oracle JDK下载地址：https://www.oracle.com/java/technologies/downloads/", "info");
                reject('error');
            };
            resolve('success');
        });
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

module.exports = {
    createOutputView,
    getJarsigner
}
