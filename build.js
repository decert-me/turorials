const util = require('util');
const fs = require('fs');
const path = require('path');
const fsextra = require('fs-extra');
const writeFileAsync = util.promisify(fs.writeFile);
const { exec } = require('child_process');
const axios = require('axios');
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const DOCS_DIR = path.join(__dirname, 'docs');

const common = {
  gitbook: "/",
  mdBook: "/",
  docusaurus: "/docs"
}

// 辅助函数：从GitHub仓库URL中提取仓库路径（格式为：username/repo）
function getRepoPath(repoUrl) {
  const repoPath = repoUrl.replace('https://github.com/', '');
  return repoPath.endsWith('.git') ? repoPath.slice(0, -4) : repoPath;
}

const downloadFile = async ({ repoUrl, commitHash, catalogueName, branch }) => {
  const targetFolder = `./tmpl/${catalogueName}/${repoUrl.split("/").reverse()[0]}`; // 替换为你要将代码拉取到的目标文件夹
  await axios.get(`https://api.github.com/repos/${getRepoPath(repoUrl)}`)
    .then(async (response) => {
      const repoInfo = response.data;
      const cloneUrl = repoInfo.clone_url;

      // 使用Git命令将代码克隆到目标文件夹
      try {
        execSync(`git clone ${cloneUrl} ${targetFolder}`);
        console.log('代码克隆成功！');
      } catch (error) {
        // console.error('代码克隆或切换commit失败:', error.message);
      }
      // 先默认回到指定分支
      execSync(`cd ${targetFolder} && git checkout ${branch || "main"}`);
      // 切换到指定的commit
      if (commitHash) {
        execSync(`cd ${targetFolder} && git checkout ${commitHash}`);
        console.log(`已切换到commit：${commitHash}`);
      } else {
        execSync(`cd ${targetFolder} && git pull`);
        console.log("代码更新成功！");
      }
    })
    .catch(error => {
      console.log('获取GitHub仓库信息失败:', error.message);
    });
};

const downloadAllFiles = async (filesToDownload) => {
  for (let i = 0; i < filesToDownload.length; i++) {
    if (filesToDownload[i]) {
      const obj = filesToDownload[i];
      await downloadFile(obj);
    }
  }
};


const extractFilesAndCopyFolder = async (destinationPath, filesNames, filesToDownload, tutorial) => {
  const { catalogueNames, docTypes, docPath } = tutorial;
  for (let i = 0; i < filesToDownload.length; i++) {
    if (filesToDownload[i]) {
      const filePath = common[docTypes[i]];
      const newPath = docPath[i] || "";
      try {
        // 将 folderToCopy 从 destinationPath 复制到另一个文件夹
        const sourceFolder = path.join(destinationPath, filesNames[i] + filePath + newPath);
        const destinationFolder = `./docs/${catalogueNames[i]}`;
        await fsextra.copy(sourceFolder, destinationFolder);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

const createFolder = (folderPath) => {
  fs.mkdir(folderPath, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Folder created successfully: ${folderPath}`);
    }
  });
};

function readJsonFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const jsonData = JSON.parse(data);
        resolve(jsonData);
      } catch (e) {
        reject(e);
      }
    });
  });
}


const buildProject = () => {
  console.log("start build");
  return new Promise((resolve, reject) => {
    const buildCommand = spawn('npm', ['run', 'docusaurus', 'build']);
    let flag = false;

    buildCommand.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    buildCommand.stderr.on('data', (data) => {
      // 忽略跳转路径错误
      if (data.indexOf("Exhaustive list of all broken links found:") !== -1) {
        flag = true
      }
      console.error(`stderr: ${data}`);
    });
    buildCommand.on('close', (code) => {
      if (code !== 0 && !flag) {
        console.log(`build process exited with code ${code}`);
        reject(code);
      } else {
        console.log('Build completed successfully');
        resolve();
      }
    });
  });
};

const compatible = () => {
  return new Promise((resolve, reject) => {
    const compatibleCommand = 'node compatible.js';
    exec(compatibleCommand, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error running compatible command: ${err}`);
        reject(err);
      } else {
        console.log('compatible successfully');
        resolve();
      }
    });
  });
};

function findLabel(data, id) {
  for (let item of data) {
    if (item.id === id) {
      return item.label;
    }
    if (item.link && item.link.id === id) {
      return item.label;
    }
    if (item.items) {
      let foundLabel = findLabel(item.items, id);
      if (foundLabel) {
        return foundLabel;
      }
    }
  }
  return null;
}

function generateFrontMatter(label, content, meta) {
  // 添加文档元数据

  if (!label) return content;

  if (content.startsWith("---")) {
    const title = content.indexOf("title:") !== -1 ? "" : `title: "${label}"`;
    const replacement = `---
${title}
description: "${meta.desc}"
image: "https://ipfs.decert.me/${meta.img}"
sidebar_label: "${label}"`;

    content = content.replace("---", replacement);
    return content;
  }

  return `---
title: "${label}"
description: "${meta.desc}"
image: "https://ipfs.decert.me/${meta.img}"
sidebar_label: "${label}"
---
${content}`;
}

function fromDir(startPath, filter, meta, list) {
  if (!fs.existsSync(startPath)) {
    console.log("no dir ", startPath);
    return;
  }

  const files = fs.readdirSync(startPath);

  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);

    if (stat.isDirectory()) {
      fromDir(filename, filter, meta, list); // recurse
    } else if (filename.indexOf(filter) >= 0 && filename.indexOf("SUMMARY.md") === -1) {
      //  添加metadata
      let content = fs.readFileSync(filename, 'utf8');
      const idToFind = filename.replace("docs/", "").replace(".md", "").replace(/\/\d+_/, '/');;
      // 判断是否是指定库 ? 图片路径替换
      if (meta.repoUrl === "https://github.com/0xdwong/rust-solana-bootcamp") {
        const regex = /\(\.\.\/\.\.\/assets\/([^)]+)\)/g;
        content = content.replace(regex, "(https://github.com/0xdwong/rust-solana-bootcamp/blob/main/assets/$1/?raw=true)");
        // 闭合标签
        const tag = /<T>|<br>/g;
        content = content.replace(tag, (match) => {
          return match === '<T>' ? '<T />' : '<br />';
        });
      }
      let label = findLabel(list, idToFind);
      content = generateFrontMatter(label, content, meta)

      fs.writeFileSync(filename, content, 'utf8');
    }
  }
}

async function metadataInit(meta, index) {

  const path = "./siteMetadata.js"
  const metadata = {
    baseUrl: "",
    metadata: []
  };
  metadata.baseUrl = index ? `/tutorial/${index}` : "/tutorial";

  metadata.metadata = [
    { name: "twiter:card", content: "summary_large_image" },
    { property: "og:url", content: "https://decert.me/tutorials" },
    { property: "title", content: `${meta.label}` },
    { property: "og:title", content: `${meta.label}` },
    { property: "description", content: meta.desc },
    { property: "og:description", content: meta.desc },
    { property: "og:image", content: "https://ipfs.decert.me/" + meta.img },
    { property: "twitter:image", content: "https://ipfs.decert.me/" + meta.img },
  ]

  await writeFileAsync(path, "module.exports = " + JSON.stringify(metadata), 'utf8');

}

function paramsInit(tutorials) {
  const filesToDownload = tutorials.map(e => {
    if (e.docType === "video" || e.docType === "page") {
      return
    }
    const file = e.repoUrl;
    const url = file.split("/").reverse();
    return {
      repoUrl: `${url[1]}/${url[0]}`,
      commitHash: e.commitHash,
      catalogueName: e.catalogueName,
      branch: e.branch
    }
  })

  const filesNames = tutorials.map(e => {
    if (e.docType === "video") {
      return
    }
    const file = e.repoUrl;
    const url = file.split("/").reverse();
    return e.catalogueName + "/" + url[0]
  })

  const tutorial = tutorials.reduce((acc, e) => {
    acc.catalogueNames.push(e.catalogueName);
    acc.docTypes.push(e.docType);
    acc.docPath.push(e.docPath);

    return acc;
  }, { catalogueNames: [], docTypes: [], docPath: [] });

  return {
    filesToDownload,
    filesNames,
    tutorial
  }
}

async function deleteCache() {
  await fsextra.remove("./docs");
  await new Promise((resolve, reject) => {
    const compatibleCommand = 'find ./src/pages -type d -mindepth 1 -maxdepth 1 -exec rm -rf {} \\;';
    exec(compatibleCommand, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error running compatible command: ${err}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function addExtraFilesToRepos(repos) {
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (!repo) {
      continue;
    }
    let { repoUrl, catalogueName } = repo;
    if (!repoUrl.startsWith("https://github.com/")) {
      repoUrl = "https://github.com/" + repoUrl;
    }

    const targetFolder = `./tmpl/${catalogueName}/${repoUrl.split("/").reverse()[0]}`;

    const addOnConfigPath = "add-on/config.json"
    if (!fs.existsSync(addOnConfigPath)) {
      continue;
    }

    const addOnConfig = JSON.parse(fs.readFileSync(addOnConfigPath, 'utf8'));
    const addOn = addOnConfig.find(e => e.repoUrl === repoUrl);
    if (!addOn) continue;

    if (addOn.summary) {
      console.log(`拷贝 summary 到 ${repo.catalogueName} 项目目录`);
      const relativeSummaryPath = addOn.summary;
      const summaryPath = path.join("add-on", relativeSummaryPath);
      if (!fs.existsSync(summaryPath)) {
        console.warn(`summary 文件不存在: ${summaryPath}`);
        continue;
      }
      // copy to targetFolder
      const targetSummaryPath = path.join(targetFolder, "SUMMARY.md");
      await fsextra.copy(summaryPath, targetSummaryPath);
    }
  }
}

const main = async () => {

  // init 
  const index = process.argv.slice(2)[0];
  const arr = await readJsonFile("tutorials.json");
  let tutorials = arr;

  await metadataInit(arr[0], index);
  //  预先删除
  await deleteCache();

  // mkdir
  const folder = "./tmpl";
  createFolder(folder);
  createFolder("./docs")

  const { filesToDownload, filesNames, tutorial } = paramsInit(tutorials)

  const generate = require('./generate');

  // Download all files
  await downloadAllFiles(filesToDownload);

  await addExtraFilesToRepos(filesToDownload)

  // copy to the docs
  await extractFilesAndCopyFolder(folder, filesNames, filesToDownload, tutorial);

  // generate sidebars、navbarItems
  await generate.main();

  // 兼容
  await compatible();

  if (arr[0].docType !== "page" && arr[0].docType !== "docusaurus" && arr[0].docType !== "video") {
    // 遍历文档，生成指定metadata。
    let json = arr.filter(e => e.docType !== "page");
    const files = fs.readdirSync(DOCS_DIR);
    const root = DOCS_DIR + "/" + files[0];
    const list = await generate.getSummary("SUMMARY.md", root, json[0])
    fromDir('./docs', '.md', json[0], list);
  }

  // Build project
  await buildProject();

  // 返回json
  const navbarItems = require("./navbarItems");
  if (navbarItems.length === 0) {
    // 没有起始页，说明是单页应用
    const obj = {
      startPage: tutorials[0].catalogueName
    }
    console.log(JSON.stringify(obj));
  } else {
    const obj = {
      startPage: navbarItems[0].docId
    }
    console.log(JSON.stringify(obj));
  }
};


main();

