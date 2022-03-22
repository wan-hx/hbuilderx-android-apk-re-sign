const { spawn, exec } = require('child_process');
const iconv = require('iconv-lite');

const os = require('os');
const osName = os.platform();

function createOutputView(msg) {
    console.log(msg);
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
                    stdoutMsg = fmsg.toString();
                } else {
                    stdoutMsg = (data.toString()).trim();
                };

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
                createOutputView(msg, 'info');
            })
        };

        child.on('error', error => {
            resolve('run_error');
        });

        child.on('close', code => {
            if (code == 0) {
                createOutputView("Android Apk签名成功!", "success");
            } else {
                createOutputView("Android Apk签名失败!", "error");
                createOutputView(`您可以在命令行终端尝试进行签名，具体的命令为: ${cmd}`, "info");
            };
            resolve('run_end');
        });
    });
};


let jarsigner = "jarsigner";
let certAlias = "testalias";
let certPassphrase = "123456";
let certPath = "";
let apkTargetPath = "";
let apkSourcePath = "";

let jarCmd = `${jarsigner} -verbose -storepass "${certPassphrase}" -keystore "${certPath}" -signedjar "${apkTargetPath}" "${apkSourcePath}" "${certAlias}"`

runCmdForSpawn(jarCmd);
