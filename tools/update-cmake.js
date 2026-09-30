const fs = require('fs');

const subDirs = ['docs', 'e2e', 'src'];
const tsEnding = 'ts';
const relEndings = ['css', 'eot', 'html', 'ico', 'jpg', 'js', 'json', 'md', 'otf', 'png', 'svg', 'tmpl', 'ttf', 'woff', 'woff2'];
const addFiles = ['browserslist', 'LICENSE'];
const ignoreFiles = [
  'resturi-override.js',
  'index.html',
  'angular.json',
  'app_logo.png',
  'proxy.conf.json',
  'ORDERING_PORTAL_WEBAPP.cmake.tmpl',
  'documentation.json',
  'junit.xml',
  'proxy.conf.json',
];
const ignorePaths = ['src/assets/html/help', 'src/app/api'];

const inFileName = 'ORDERING_PORTAL_WEBAPP.cmake.tmpl';
const outFileName = 'ORDERING_PORTAL_WEBAPP.cmake';

const sourceFiles = [];
const dataFiles = [];
const sourceFilePlaceholder = '[SOURCE_FILES]';
const dataFilePlaceholder = '[DATA_FILES]';

function handleDirectory(dir, recurse) {
  // console.log('Reading directory ' + dir);
  const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirEntry of dirEntries) {
    if (recurse && dirEntry.isDirectory()) {
      const fullSubDirPath = dir + '/' + dirEntry.name;
      if (ignorePaths.indexOf(fullSubDirPath) < 0) {
        handleDirectory(dir + '/' + dirEntry.name, recurse);
      }
    } else if (dirEntry.isFile()) {
      if (ignoreFiles.indexOf(dirEntry.name) < 0) {
        // For root directory (.), don't add the ./ prefix
        const fullFilePath = dir === '.' 
          ? dirEntry.name.replace(' ', '\\ ')
          : dir + '/' + dirEntry.name.replace(' ', '\\ ');
        if (addFiles.indexOf(dirEntry.name) >= 0) {
          dataFiles.push(fullFilePath);
        } else if (dirEntry.name.endsWith('.' + tsEnding)) {
          sourceFiles.push(fullFilePath);
        } else {
          for (const ending of relEndings) {
            if (dirEntry.name.endsWith('.' + ending)) {
              dataFiles.push(fullFilePath);
              break;
            }
          }
        }
      }
    }
  }
}

// #1 Relevante Directories einlesen
console.log('Reading relevant directories');
handleDirectory('.', false);
for (const subDir of subDirs) {
  handleDirectory(subDir, true);
}

// #2 Template File lesen, Ausgabe schreiben
console.log('Processing template file');
const inFileData = fs.readFileSync(inFileName, 'utf8');
const lines = inFileData.split('\n');
const outFile = fs.openSync(outFileName, 'w');
for (const line of lines) {
  if (line.indexOf(sourceFilePlaceholder) >= 0) {
    for (const sf of sourceFiles) {
      fs.writeSync(outFile, '  ' + sf + '\n');
    }
  } else if (line.indexOf(dataFilePlaceholder) >= 0) {
    for (const df of dataFiles) {
      fs.writeSync(outFile, '  ' + df + '\n');
    }
  } else {
    fs.writeSync(outFile, line + '\n');
  }
}

console.log(outFileName + ' successfully updated.');
