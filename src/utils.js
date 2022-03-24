const fs = require('fs');
const path = require('path');
const hx = require('hbuilderx');
const { spawn, exec } = require('child_process');
const iconv = require('iconv-lite');

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


// 使用exec执行cmd命令
function runCmdForExec(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                createOutputView(`命令执行错误：\n${error}`, 'error');
                reject(error);
            };
            if (stdout) {
                let fmsg1 = iconv.decode(stdout, 'cp936');
                fmsg1 = fmsg1.toString();
                createOutputView(`命令执行详情：\n${fmsg1}`, 'info');
                resolve(stdout);
            };
            if (stderr) {
                let fmsg2 = iconv.decode(stderr, 'cp936');
                fmsg2 = fmsg2.toString();
                createOutputView(`命令执行详情：\n${fmsg2}`, 'info');
                resolve(stderr);
            };
        });
    }).catch((error) => {
        console.error(error);
    });
};

/**
 * @description 命令行运行
 * @param {String} cmd - 命令行运行的命令
 */
function runCmdForSpawn(cmd = '', runDir) {

    let opts = {};
    let cwd = process.cwd();
    let env = process.env.PATH;
    if (runDir) {
        cwd = process.cwd();
        env = osName == 'win32' ? env + ";"+runDir : env + ":"+runDir;
    };

    opts = {
        stdio: 'pipe',
        cwd: cwd,
        env: {
            PATH: env
        }
    };

    const shell = process.platform === 'win32' ? {cmd: 'cmd',arg: '/C'} : {cmd: 'sh',arg: '-c'};
    let child;

    try {
        child = spawn(shell.cmd, [shell.arg, cmd], opts);
        child_pid = child.pid;
    } catch (error) {
        return Promise.reject(error)
    };

    return new Promise(resolve => {
        if (child.stdout) {
            child.stdout.on('data', data => {
                let stdoutMsg;
                if (osName != 'darwin') {
                    let fmsg = iconv.decode(Buffer.from(data, 'binary'), 'cp936');
                    stdoutMsg = (fmsg.toString()).trim();
                } else {
                    stdoutMsg = (data.toString()).trim();
                };
                if (stdoutMsg.length != 0) {
                    createOutputView(stdoutMsg, 'info');
                    if ((stdoutMsg.includes("证书链") && stdoutMsg.includes("找不到")) || (stdoutMsg.includes("Certificate chain not found for"))) {
                        createOutputView(`可能的原因：Android证书别名无效！`, 'error');
                    };
                    if (stdoutMsg.includes("password was incorrect")) {
                        createOutputView(`原因：Android证书密码无效或错误！`, 'error');
                    };
                    if (stdoutMsg.includes("无法对 jar 进行签名") && stdoutMsg.includes("java.util.zip.ZipException")) {
                        createOutputView(`原因：你正尝试签署已签名的.apk。你需要导出未签名的.apk文件，然后使用签名jarsigner`, 'error');
                    };
                }
            });
        };

        let runDir = opts.cwd;
        if (child.stderr) {
            child.stderr.on('data', data => {
                let msg;
                if (osName != 'darwin') {
                    let stdMsg = iconv.decode(Buffer.from(data, 'binary'), 'cp936')
                    msg = stdMsg.toString();
                } else {
                    msg = data.toString();
                };
                if (msg.length != 0) {
                    createOutputView(msg, 'info');
                };
            })
        };

        child.on('error', error => {
            resolve('run_error');
        });

        child.on('close', code => {
            if (code == 0) {
                createOutputView(`执行命令如下: ${cmd}\n`, "info");
                createOutputView("Android Apk签名成功!", "success");
            } else {
                createOutputView("Android Apk签名失败!", "error");
                createOutputView(`您可以在命令行终端尝试进行签名，具体的命令为: ${cmd}`, "info");
            };
            resolve('run_end');
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


function hxShowMessageBox(title, text, buttons = ['关闭']) {
    return new Promise((resolve, reject) => {
        if ( buttons.length > 1 && (buttons.includes('关闭') || buttons.includes('取消')) ) {
            if (osName == 'darwin') {
                buttons = buttons.reverse();
            };
        };
        hx.window.showMessageBox({
            type: 'info',
            title: title,
            text: text,
            buttons: buttons,
            defaultButton: 0,
            escapeButton: -100
        }).then(button => {
            resolve(button);
        }).catch(error => {
            reject(error);
        });
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

/**
 * @description 执行cmd命令
 * @param {Object} cmd
 * @param {Object} runDir
 */
async function runCmd(cmd, runDir) {
    runCmdForSpawn(cmd, runDir);
    // if (osName == 'win32') {
    //     runCmdForExec(cmd);
    // } else {
    //     runCmdForSpawn(cmd, runDir);
    // }
};

module.exports = {
    runCmd,
    createOutputView,
    hxShowMessageBox,
    getJarsigner,
    getApkSigner,
    getPluginsConfig
}
