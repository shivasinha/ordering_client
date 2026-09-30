#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function sortObjByKey(value, sortNestedAsWell) {
  return typeof value === 'object'
    ? Array.isArray(value)
      ? value.map(sortObjByKey)
      : Object.keys(value)
          .sort()
          .reduce((o, key) => {
            const v = value[key];
            o[key] = sortNestedAsWell ? sortObjByKey(v, sortNestedAsWell) : v;
            return o;
          }, {})
    : value;
}

const warn = message => console.warn('\x1b[33m!!\x1b[0m', message);

const translationsFile = path.resolve(__dirname, '../src/assets/lang/translations.json');

// check if file exists
if (!fs.existsSync(translationsFile)) {
  console.error(`Failed to find translation file "${jsonFile}"!`);
  return -1;
}

const content = JSON.parse(fs.readFileSync(translationsFile, 'utf-8'));
const sortedContent = JSON.stringify(sortObjByKey(content, true), null, 4);

// check if something has changed if the translations are sorted correctly
if (sortedContent !== JSON.stringify(content, null, 4)) {
  warn('translations.json has changed after sorting. Overwriting file ...');
  fs.writeFileSync(translationsFile, sortedContent);
}

// check for missing translations
const missingTranslations = Object.entries(content).reduce((acc, [key, value]) => {
  if (!value.fi) {
    acc.push({ key, ...value });
  }
  return acc;
}, []);

if (missingTranslations.length > 0) {
  warn('Some Slovenian translations are missing.');
  const csvFileName = path.resolve(__dirname, 'missing-translations.csv');
  fs.writeFileSync(
    csvFileName,
    'Key; English; Slovenian; Remark\n' + missingTranslations.map(v => `${v.key}; ${v.en}; ${v.sl}; ${v.remark}`).join('\n'),
    'utf-8',
  );

  console.log('Created CSV report:', csvFileName);
}
