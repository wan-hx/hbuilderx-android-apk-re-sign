const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');
const {exec} = require('child_process');

const hx = require('hbuilderx');

const { createOutputView, getJarsigner } = require('./utils.js');


const osName = os.platform();

let USERHOME = osName == 'darwin'
    ? process.env.HOME
    : path.join(process.env.HOMEDRIVE, process.env.HOMEPATH);


// 执行cmd命令
function runCmd(cmd) {
    createOutputView(`执行的命令如下：\n${cmd}`, 'info');
    return new Promise((resolve, reject) => {
        exec(cmd, function(error, stdout, stderr) {
            if (error) {
                console.error("Android Apk重签名：", error);
            };
            createOutputView(`命令执行失败，日志：\n${stdout}`, 'error');
            resolve(stdout);
        });
    }).catch((error) => {
        console.error(error);
    });
};

/**
 * @description 执行apk_sign
 * jarsigner -verbose -storepass [签名密码] -keystore [签名路径] -signedjar [签名后的apk文件路径] [未签名的apk文件路径] [证书别名]
 */
async function apk_sign(data) {
    let {certPath, certPassphrase, certAlias, apkSourcePath, apkTargetPath} = data;

    if (apkTargetPath == "" || !apkTargetPath) {
        let info = path.parse(apkSourcePath);
        let {dir, name} = info;
        let targetFileName = name + Date.parse(new Date()) + ".apk"
        apkTargetPath = path.join(dir, targetFileName);
    };
    let cmd = `jarsigner -verbose -storepass ${certPassphrase} -keystore ${certPath} -signedjar ${apkTargetPath} ${apkSourcePath} ${certAlias}`;

    let result = await runCmd(cmd);
    if (result.includes("无法对 jar 进行签名")) {
        createOutputView(`原因：你正尝试签署已签名的.apk。你需要导出未签名的.apk文件，然后使用签名jarsigner`, 'error');
    };
};

/**
 * @description Android Apk重签名
 */
class reSign {
    constructor(arg) {
        this.windowsDesc = {
           apkSourcePath: '待签名的Apk包路径',
           apkTargetPath: '签名后apk输出路径',
           certAlias: 'Android证书别名',
           certPath: 'Android证书文件',
           certPassphrase: 'Android证书密码'
        };
    }

    /**
     * @description 检查文件或目录信息
     * @returns Boolean 布尔值
     */
    async checkFileInfo(item, expect) {
        try{
            let stat = fs.statSync(item);
            if (stat.isFile() && expect == "File") {
                return stat.isFile() ? true : false;
            };
        }catch(e){
            return true;
        };
        return true;
    };

    /**
     * @description 校验输入
     * @param {Object} formData
     * @param {Object} that
     */
    async goValidate(formData, that) {
        let verifyItems = Object.keys(this.windowsDesc);
        let errMsg = false;
        for (let s in formData) {
            if (!verifyItems.includes(s)) continue;
            let v = formData[s];
            let desc = this.windowsDesc[s];
            if (v.replace(/(^\s*)|(\s*$)/g, "") == '' && s != "apkTargetPath") {
                errMsg = `${desc}：请检查此项，不允许为空! `
                break;
            };
            if (["apkSourcePath", "certPath"].includes(s) && fs.existsSync(v)) {
                let check1 = await this.checkFileInfo(v, "File");
                if (!check1) {
                    errMsg = `${desc}：不是有效的文件路径, 请重新填写！`
                };
            };
            let extname=path.extname(v);
            if (s == "apkSourcePath" && extname != ".apk") {
                errMsg = `${desc}：必须为文件，且以.apk结尾！`
            };
            if (s == "apkTargetPath" && extname == ".apk") {
                let dirName = path.dirname(v);
                if (!fs.existsSync(dirName)) {
                    errMsg = `${desc}：${dirName} 目录路径无效`
                };
            };
        };

        if (errMsg) {
            that.showError(errMsg);
            return false;
        };
        return true;
    };

    /**
     * @description 绘制视图
     * @param {Object} change
     * @param {Object} formData
     */
    getFormItems(change, formData) {
        let formItems = [
            {type: "label",name: "blanLink",text: ""},
            {type: "fileSelectInput", mode: "file", name: "apkSourcePath",label: "待签名的Apk包路径", value: "", placeholder: "必填，Android Apk包文件路径"},
            {type: "input",  name: "apkTargetPath",label: "签名后apk输出路径", value: "", placeholder: "非必填，如果不填，默认输出到当前apk同级目录"},
            {type: "fileSelectInput", mode: "file", name: "certPath",label: "Android证书文件",placeholder: '必填',value: ""},
            {type: "input",name: "certPassphrase",label: "Android证书密码", placeholder: "必填"},
            {type: "input",name: "certAlias",label: "Android证书别名", placeholder: "必填"},
            {type: "label",name: "text",text: "<span style='color: #a0a0a0; font-size: 11px;'>备注：本插件调用的是java jarsigner命令。</span>"}
        ];
        return {
            title: "Android Apk包重签名",
            width: 590,
            height: 360,
            footer: '<a href="">相关文档</a>',
            formItems: formItems,
        };
    };

    async main() {
        // 检查命令行工具
        getJarsigner();

        // 打开窗口
        let that = this;
        let setInfo = await hx.window.showFormDialog({
            submitButtonText: "确定(&S)",
            cancelButtonText: "取消(&C)",
            validate: function(formData) {
                let checkResult = that.goValidate(formData, this);
                return checkResult;
            },
            onChanged: function (field, value, formData) {},
            ...that.getFormItems()
        }).then((res) => {
            return res;
        }).catch(error => {
            console.log(error);
        });

        if (setInfo == undefined) return;
        apk_sign(setInfo)
    };

}



module.exports = reSign;
