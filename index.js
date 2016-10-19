/**
 * @description lmat提交代码至 icode
 * @author mabin03@baidu.com
 * @date 2016-10-15
 */

var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var Promise = require('pinkie-promise')
var juicer = require('juicer');
var colors = require('colors');
var fs = require('fs');

exports.name = 'commit';
exports.desc = 'commit the FE project to iCode';
exports.options = {
    '-h, --help': '-m 提交备注,--add 待加入版本控制的文件',
    '-m': '提交内容',
    '--add': '待加入版本控制的文件'
};

exports.run = function(argv, cli) {
    var path = argv.path || '';
    var projectName = '';
    var gitUsername = '';
    var refsInfo = '';
    var branchName = '';
    var marketMsg = argv.m || 'commits';
    var addFiles = argv.add || ['**'];
    addFiles = typeof(addFiles) == 'string' ? addFiles.split(',') : addFiles;
    addFiles = addFiles.join(' ');
    var errorMsg = '';

    if (argv.h || argv.help) {
        return cli.help(exports.name, exports.options);
    }

    new Promise(function(resolve, reject) {
        fs.readFile('./.git/HEAD', 'utf8', function(error, data) {
            if (error) {
                errorMsg = error || '';
                reject(errorMsg);
                return console.log(errorMsg.red);
            }
            data = data.match(/\s(refs\/.+)$/im) || ['', ''];
            refsInfo = data[1];
            branchName = refsInfo.match(/^refs\/heads\/(.+)/im) || ['', ''];
            branchName = branchName[1];
            resolve(refsInfo);
        });
    }).then(function(headInfo) {
        // 获取 git 用户名
        return new Promise(function(resolve, reject) {
            exec('git config --global user.name', function(error, stdout, stedrr) {
                if (error) {
                    errorMsg = error || '';
                    reject(errorMsg);
                    return console.log(errorMsg.red);
                }
                gitUsername = stdout.replace(/\n/img, '');
                resolve(gitUsername);
            });
        });
    }).then(function(gitUsername) {
        // 获取当前项目名称
        return new Promise(function(resolve, reject) {
            exec('pwd', function(error, stdout, stedrr) {
                if (error) {
                    errorMsg = error || '';
                    reject(errorMsg);
                    return console.log(errorMsg.red);
                }
                projectName = stdout.split('/')[stdout.split('/').length - 1].replace(/\n/img, '');
                console.log(('当前项目名称:' + projectName).green);
                resolve(projectName);
            });
        });
    }).then(function() {
        // 添加提交问题 默认提交全部文件
        return new Promise(function(resolve, reject) {
            exec('git add ' + addFiles + ' -f', function(error, stdout, stedrr) {
                if (error) {
                    errorMsg = stedrr || stdout || error || '';
                    reject(errorMsg);
                    return console.log(errorMsg.red);
                }
                console.log(('待加入版本控制的文件名:' + addFiles).green);
                resolve();
            });
        });
    }).then(function() {
        // 提交到本地git库
        return new Promise(function(resolve, reject) {
            exec('git commit -m "' + marketMsg + ' commited by lmat"', function(error, stdout, stedrr) {
                console.log(stdout);
                if (error) {
                    errorMsg = stedrr || stdout || error || '';
                    if (errorMsg.indexOf('use "git push" to publish your local commits') > -1) { //有已commit且未push的代码 直接执行 push 操作
                        return resolve();
                    }
                    reject(errorMsg);
                    return console.log(errorMsg.red);
                }
                resolve();
            });
        });
    }).then(function() {
        // push代码到远端git库
        return new Promise(function(resolve, reject) {
            exec('git push -u origin ' + branchName + ':refs/for/' + branchName, function(error, stdout, stedrr) {
                var _stedrr = stedrr.replace(/\n/img, '');
                var reg = new RegExp('(http:\/\/icode\.baidu\.com\/review\/changes\/.+)' + marketMsg, 'im');
                var url = _stedrr.match(reg) || [undefined, undefined];
                var _error = _stedrr.match(/\[remote rejected\].*/img) || [undefined];
                _error = _error[0];
                url = url[1];
                if (error || _error) {
                    errorMsg = _error || _stedrr || stdout || error || '';
                    if (errorMsg.indexOf('Try create branch first') > -1) { //分支不存在 需要进行首次push操作
                        return resolve();
                    }
                    reject(errorMsg);
                    return console.log(errorMsg.red);
                }
                console.log(stedrr);
                console.log('项目代码已经提交至 icode'.green);
                url && console.log('代码评审地址：' + url);
                url && execSync('open ' + url); //打开代码评审界面
                console.log('已经进入代码评审流程'.green);
                return; //push 完成 流程终止
            });
        });
    }).then(function() {
        // 首次push代码到远端git库
        return new Promise(function(resolve, reject) {
            exec('git push -u origin ' + branchName, function(error, stdout, stedrr) {
                var _stedrr = stedrr.replace(/\n/img, '');
                var reg = new RegExp('(http:\/\/icode\.baidu\.com\/review\/changes\/.+)' + marketMsg, 'im');
                var url = stedrr.match(reg) || [undefined, undefined];
                var _error = stedrr.match(/\[remote rejected\].*/img) || [undefined];
                _error = _error[0];
                url = url[1];
                if (error || _error) {
                    errorMsg = _error || stedrr || stdout || error || '';
                    reject(errorMsg);
                    return console.log(errorMsg.red);
                }
                url && execSync('open ' + url); //打开代码审核界面
                console.log(stedrr);
                console.log('项目代码已经提交至 icode'.green);
            });
        });
    });
};
