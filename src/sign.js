const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');
const {
    exec
} = require('child_process');

const {
    runCmd,
    createOutputView,
    getPluginsConfig,
    getApkSigner,
    getJarsigner
} = require('./utils.js');


const osName = os.platform();

/**
 * @description 执行apk_sign
 */
class ApkSign {
    constructor() {}

    async useJarSigner(cmd) {
        // 获取用户自定义的jarsigner路径
        let jarSignerPath = await getPluginsConfig("AndroidApkSign.jarSignerPath");
        if (!jarSignerPath) {
            let check = await getJarsigner();
            if (check != 'success') {
                createOutputView(`HBuilderX 【设置 - 插件配置】，自定义的jarsigner路径无效`, 'error');
                return;
            };
        };

        // jarSigner工具所在的目录
        let runDir;
        if (jarSignerPath) {
            runDir = path.dirname(jarSignerPath);
        };

        let lastCmd = jarSignerPath ? `${jarSignerPath} ${cmd}` : `jarsigner ${cmd}`;
        await runCmd(lastCmd, runDir);
    };

    async useApkSigner(cmd) {
        // 获取用户自定义的apksigner路径
        let apkSignerPath = await getPluginsConfig("AndroidApkSign.apkSignerPath");
        if (!apkSignerPath) {
            let check = await getApkSigner();
            if (check != 'success') {
                createOutputView(`HBuilderX 【设置 - 插件配置】，自定义的apksigner路径无效`, 'error');
                return;
            };
        };

        // apkSigner工具所在的目录
        let runDir;
        if (apkSignerPath) {
            runDir = path.dirname(apkSignerPath);
        };

        let lastCmd = apkSignerPath ? `${apkSignerPath} ${cmd}` : `apksigner ${cmd}`;
        await runCmd(lastCmd, runDir);
    };

    async getApkTargetPath(apkSourcePath, apkTargetPath) {
        // 解析源apk路径
        let info = path.parse(apkSourcePath);
        let {dir, name} = info;

        // 输出的apk文件名
        let targetFileName = name + '_' + Date.parse(new Date()) + ".apk";

        // 当输出apk路径为空时
        if (apkTargetPath == "" || !apkTargetPath) {
            apkTargetPath = path.join(dir, targetFileName);
        };

        // 当输出apk路径为目录时
        if (apkTargetPath) {
            try{
                let targetStat = fs.statSync(apkTargetPath);
                if (targetStat.isDirectory()) {
                    apkTargetPath = path.join(apkTargetPath, targetFileName);
                };
            }catch(e){};
        };
        return apkTargetPath;
    };

    async main(data) {
        let {
            certPath,
            certPassphrase,
            certAlias,
            apkSourcePath,
            apkTargetPath,
            tool
        } = data;

        apkTargetPath = await this.getApkTargetPath(apkSourcePath, apkTargetPath);

        if (tool == 'jarsigner') {
            let jarCmd = `-verbose -storepass "${certPassphrase}" -keystore "${certPath}" -signedjar "${apkTargetPath}" "${apkSourcePath}" "${certAlias}"`;
            if (osName == 'win32') {
                jarCmd = `-verbose -storepass ${certPassphrase} -keystore ${certPath} -signedjar ${apkTargetPath} ${apkSourcePath} ${certAlias}`;
            };
            this.useJarSigner(jarCmd);
        } else {
            let cmd = `sign --ks "${certPath}" --ks-pass "pass:${certPassphrase}"  --ks-key-alias "${certAlias}" -out "${apkTargetPath}" "${apkSourcePath}"`;
            if (osName == 'win32') {
                jarCmd = `sign --ks "${certPath}" --ks-pass pass:${certPassphrase}  --ks-key-alias ${certAlias} -out ${apkTargetPath} ${apkSourcePath}`;
            };
            this.useApkSigner(cmd);
        };
    };
};


module.exports = ApkSign;
