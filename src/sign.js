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

    main(data) {
        let {
            certPath,
            certPassphrase,
            certAlias,
            apkSourcePath,
            apkTargetPath,
            tool
        } = data;

        if (apkTargetPath == "" || !apkTargetPath) {
            let info = path.parse(apkSourcePath);
            let {dir, name} = info;
            let targetFileName = name + Date.parse(new Date()) + ".apk"
            apkTargetPath = path.join(dir, targetFileName);
        };

        if (tool == 'jarsigner') {
            let jarCmd = `-verbose -storepass "${certPassphrase}" -keystore "${certPath}" -signedjar "${apkTargetPath}" "${apkSourcePath}" "${certAlias}"`;
            this.useJarSigner(jarCmd);
        } else {
            let cmd = `sign --ks "${certPath}" --ks-pass "pass:${certPassphrase}"  --ks-key-alias "${certAlias}" -out "${apkTargetPath}" "${apkSourcePath}"`;
            this.useApkSigner(cmd);
        };
    };
};


module.exports = ApkSign;
