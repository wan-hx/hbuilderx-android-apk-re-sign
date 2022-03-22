const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');

const hx = require('hbuilderx');

const {
    createOutputView,
    getJarsigner,
    getApkSigner
} = require('./utils.js');
const ApkSign = require('./sign.js')


// 窗口输入框上次填写信息
let windowsHistoryInfo = {};


/**
 * @description Android Apk重签名
 */
class reSign {
    constructor(param) {
        this.windowsDesc = {
            apkSourcePath: '待签名的Apk包路径',
            apkTargetPath: '签名后apk输出路径',
            certAlias: 'Android证书别名',
            certPath: 'Android证书文件',
            certPassphrase: 'Android证书密码'
        };
        this.selectFileInfo = param;
        this.apkSourcePath = "";
        this.certInfo = {};
    }

    /**
     * @description 检查文件或目录信息
     * @returns Boolean 布尔值
     */
    async checkFileInfo(item, expect) {
        try {
            let stat = fs.statSync(item);
            if (stat.isFile() && expect == "File") {
                return stat.isFile() ? true : false;
            };
        } catch (e) {
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
            let extname = path.extname(v);
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
     * @description 绘制窗口
     * @param {Object} change
     * @param {Object} formData
     */
    getFormItems(change, formData) {
        const subtitle = '<span style="color: #a0a0a0; font-size: 11px;">jarsigner支持V1签名，apksigner支持v2签名。如果您不了解两者区别，建议选择使用jarsigner对apk进行签名。</span>'
        const helper = '<p><a href="https://ext.dcloud.net.cn/plugin?name=app-certificate-tools">Android证书生成工具</a>、<a href="https://ext.dcloud.net.cn/plugin?name=android-apk-re-sign">寻求帮助</a></p>';
        const PlayTour= '<span style="color: #a0a0a0; font-size: 13px;">插件开发不易，请作者喝杯可乐吧 </span><a href="https://ext.dcloud.net.cn/plugin?name=android-apk-re-sign">打赏作者</a>';

        let apkSourcePath = this.apkSourcePath ? this.apkSourcePath : "";
        let certPath = this.certInfo.certPath ? this.certInfo.certPath : '';
        let certPassphrase = this.certInfo.certPassphrase ? this.certInfo.certPassphrase : '';
        let certAlias = this.certInfo.certAlias ? this.certInfo.certAlias : '';
        let tool = this.certInfo.tool ? this.certInfo.tool : 'jarsigner';

        let formItems = [
            {type: "label",name: "blanLink1",text: ""},
            {
                type: "radioGroup",label: "Apk签名工具",name: "tool",value: tool,
                items: [
                    {label: "jarsigner(JDK签名工具)          ",id: "jarsigner"},
                    {label: "apksigner(Android SDK下的签名工具)",id: "apksigner"}
                ]
            },
            {type: "fileSelectInput",mode: "file",name: "apkSourcePath",label: "待签名的Apk包路径",value: apkSourcePath,placeholder: "必填，Android Apk包文件路径"},
            {type: "input",name: "apkTargetPath",label: "签名后apk输出路径",value: "",placeholder: "非必填，如果不填，默认输出到当前apk同级目录"},
            {type: "fileSelectInput",mode: "file",name: "certPath",label: "Android证书文件",placeholder: '必填',value: certPath},
            {type: "input",name: "certPassphrase",label: "Android证书密码",placeholder: "必填",value: certPassphrase},
            {type: "input",name: "certAlias",label: "Android证书别名",placeholder: "必填",value: certAlias},
            {type: "label",name: "text",text: helper }
        ];
        return {
            title: "Android Apk包签名",
            subtitle: subtitle,
            width: 590,
            height: 360,
            footer: PlayTour,
            formItems: formItems,
        };
    };

    // 自动填充
    async windowsAutoFill() {
        if (this.selectFileInfo == null) return;
        try {
            let info = this.selectFileInfo;
            let apkPath = info.fsPath;
            let extname = path.extname(apkPath);
            if (fs.existsSync(apkPath) && extname == '.apk') {
                this.apkSourcePath = apkPath;
            } else {
                this.apkSourcePath = "";
            };
        } catch (e) { };

        try {
            if (JSON.stringify(windowsHistoryInfo) != '{}') {
                let {certPath, certPassphrase, certAlias, tool} = windowsHistoryInfo;
                this.certInfo = {certPath, certPassphrase, certAlias, tool};
            };
        } catch (e) { };
    };

    async main() {
        // 解析HBuilderX项目管理器选中的apk信息，以便自动填充
        await this.windowsAutoFill()

        // 打开窗口
        let that = this;
        let setInfo = await hx.window.showFormDialog({
            submitButtonText: "确定(&S)",
            cancelButtonText: "取消(&C)",
            validate: function (formData) {
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

        // 记录填写信息
        windowsHistoryInfo = setInfo;

        // 执行命令
        let sign = new ApkSign()
        sign.main(setInfo)
    };
}

module.exports = reSign;
