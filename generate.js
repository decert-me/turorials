const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, 'docs');

function getDirectory(data, catalogueName) {
  let directory
  const lines = data.split('\n');
    const result = [];
    let currentCategory = '';
    
    lines.forEach((line, i) => {
      if (line.startsWith('*')) {
        const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          const title = match[1];
          const link = match[2].replace(".md","").replace(/^\d+_/, '');
          result.push({ title, link, category: currentCategory });
        }
      } else if (line.startsWith('## ')) {
        currentCategory = line.replace('## ', '');
      } else if (line.trim() !== '') {
        result.push({ title: line.trim(), link: undefined, category: currentCategory });
      }
    });
    directory = result;
    const arr = [];
    directory.map((e, i) => {
      e.category ?
      arr.push({
        type: 'category',
        label: e.category,
        items: [
          `${catalogueName}/${e.link}`
        ],
      })
      :
      arr.push(`${catalogueName}/${e.link}`)
    })

    const newArr = arr.reduceRight((acc, item) => {
      if (typeof item === 'object') {
        const existingIndex = acc.findIndex(obj => obj.label === item.label);
      
        if (existingIndex === -1) {
          acc.push(item);
        } else {
          acc[existingIndex].items = [...item.items, ...acc[existingIndex].items];
        }
      } else {
        acc.push(item);
      }
      
      return acc;
    }, []);
    
  return newArr.reverse()
}

function getMdBook(data, catalogueName) {
  const lines = data.split('\n');
  // 解析每一行的配置信息
  const summary = [
    `${catalogueName}/README`
  ];
  let currentChapter = null;
  let currentSection = null;

  lines.forEach((line) => {
    const matchChapter = line.match(/^- \[([^[\]]+)\]\(([^()]+)\)$/);
    const matchSection = line.match(/^    - \[([^[\]]+)\]\(([^()]+)\)$/);

    if (matchChapter) {
      const chapterTitle = matchChapter[1];
      const chapterLink = matchChapter[2];
      // currentChapter = { title: chapterTitle, link: chapterLink, sections: [] };
      currentChapter = {
        type : "category",
        label: chapterTitle.replace("./", catalogueName+"/").replace(".md",'').replace(/\d+_/, "").replace(/%20/g, " "),
        items: []
      }
      summary.push(currentChapter);
    } else if (matchSection && currentChapter) {
      const sectionTitle = matchSection[1];
      const sectionLink = matchSection[2];
      // currentSection = { title: sectionTitle, link: sectionLink };
      currentSection = sectionLink.replace("./", catalogueName+"/").replace(".md",'').replace(/\d+_/, "").replace(/%20/g, " ");
      currentChapter.items.push(currentSection);
    }
  });
  return summary;
}

const tutorialGitbook = async(filename, root, tutorial) => {
  return await new Promise((resolve, reject) => {
    fs.readFile(root+"/"+filename, 'utf8', (err, data) => {
      if (err) reject(err)
      const arr = getDirectory(data, tutorial.catalogueName);
      resolve(arr)
    });
  }).then(res => {
    return res
  })
}

const tutorialDocusaurus = async(file) => {
  return [
    {
        type: "autogenerated",
        dirName: file
    }
  ]
}

const tutorialMdBook = async(filename, root, tutorial) => {
  return await new Promise((resolve, reject) => {
    fs.readFile(root+"/"+filename, 'utf8', (err, data) => {
      if (err) reject(err)
      const arr = getMdBook(data, tutorial.catalogueName)
      resolve(arr)
    });
  }).then(res => {
    return res
  })
}

const getSidebars = async(dir, sidebars = {}) => {
    const files = fs.readdirSync(dir);
    const tutorials = await readJsonFile("tutorials.json");
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const root = dir+"/"+file;
    const tutorial = tutorials.filter(e => e.catalogueName === file)[0];
    // 读取当前文件目录
    const filename = "SUMMARY.md"
    switch (tutorial.docType) {
      case "gitbook":
        sidebars[file] = await tutorialGitbook(filename, root, tutorial)
        break;
      case "docusaurus":
        sidebars[file] = await tutorialDocusaurus(file)
        break;
        case "mdBook":
        sidebars[file] = await tutorialMdBook(filename, root, tutorial)
        break;
      default:
        break;
    }
  }
  return sidebars;
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

const getNavbarItems = async(dir, navbarItems = []) => {
    const files = fs.readdirSync(dir);
    const tutorials = await readJsonFile("tutorials.json");
    // 初始化
    // navbarItems.push({
    //     href: 'https://github.com/decert-me/tutorials',
    //     label: 'GitHub',
    //     position: 'right',
    // })
    tutorials.map((e, i) => {
      const file = files.filter(item => item === e.catalogueName)[0];
      navbarItems.push({
        type: 'doc',
        docId: file+"/"+e.startPage,
        position: 'left',
        label: e.label,
      })
    })
    return navbarItems;
};


async function generateSidebars(params) {
  const sidebar = await getSidebars(DOCS_DIR);

// 侧边栏
fs.writeFileSync(
  path.join(__dirname, 'sidebars.js'),
  `module.exports = ${JSON.stringify(sidebar, null, 2)};`
);
}

async function generateNavbarItemsFile() {
    const navbarItems = await getNavbarItems(DOCS_DIR);
    fs.writeFileSync(
      path.join(__dirname, 'navbarItems.js'),
      `module.exports = ${JSON.stringify(navbarItems, null, 2)};`
    );
}


const main = async () => {
  
  generateSidebars();
  generateNavbarItemsFile(); // 执行函数
}

main();