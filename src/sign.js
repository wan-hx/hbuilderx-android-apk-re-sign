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
            if (check != 'success') return;
        };

        let lastCmd = jarSignerPath ? `"${jarSignerPath}" ${cmd}` : `jarsigner ${cmd}`;
        let result = await runCmd(lastCmd);

        if (result.includes("无法对 jar 进行签名") && result.includes("java.util.zip.ZipException")) {
            createOutputView(`原因：你正尝试签署已签名的.apk。你需要导出未签名的.apk文件，然后使用签名jarsigner`, 'error');
        };
        if (result.includes("证书链") && result.includes("找不到")) {
            createOutputView(`可能的原因：Android证书别名无效！`, 'error');
        };
        if (result.includes("keystore password was incorrect")) {
            createOutputView(`原因：Android证书密码无效或错误！`, 'error');
        };
    };

    async useApkSigner(cmd) {
        // 获取用户自定义的apksigner路径
        let apkSignerPath = await getPluginsConfig("AndroidApkSign.apkSignerPath");
        if (!apkSignerPath) {
            let check = await getApkSigner();
            if (check != 'success') return;
        };

        let lastCmd = apkSignerPath ? `"${apkSignerPath}" ${cmd}` : `apksigner ${cmd}`;
        let result = await runCmd(lastCmd);
        
        if (result == '') {
            createOutputView(`apksigner对apk包签名成功。`, 'success');
        };
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
