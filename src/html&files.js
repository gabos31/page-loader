import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';

const debugHtml = debug('page-loader:html&files.js');

const arrLinks = [];
const responses = {};
const tags = ['img', 'link', 'script'];
debugHtml('tags for replacement %o', tags.toString());
const attrs = { link: 'href', img: 'src', script: 'src' };
const arrays = {};

const loadHtml = link => axios.get(link);

const fillArrLinks = (html, outputDirPath) => {
  responses.first = html;
  const $ = cheerio.load(html);
  tags.forEach((tag) => {
    arrays[tag] = [];
    $(tag).each(function f() {
      const address = $(this).attr(attrs[tag]);
      if (address && url.parse(address).protocol === null) {
        debugHtml('original references for replacement %o', address);
        arrays[tag].push(address);
      }
    });
    arrLinks.push(...arrays[tag]);
  });
  return arrLinks.length > 0 ? fs.mkdir(outputDirPath) : null;
};

const loadSubFiles = (link) => {
  const { origin } = new url.URL(link);
  const promises = arrLinks.map(item =>
    axios.get(`${origin}${item}`, { responseType: 'stream' }));
  return Promise.all(promises);
};

const saveSubFiles = (responsesArray, makeSubFileName, outputDirPath) => {
  const promises = responsesArray.map(({ data }, index) =>
    data.pipe(fs.createWriteStream(makeSubFileName(
      outputDirPath,
      arrLinks[index],
    ))));
  return Promise.all(promises);
};

const replaceLink = (makeLocalLink, htmlFilePath) => {
  const $ = cheerio.load(responses.first);
  tags.forEach((tag) => {
    arrays[tag].forEach((address) => {
      const localLink = makeLocalLink(address);
      const attr = attrs[tag];
      $(`${tag}[${attr}='${address}']`).each(function f() {
        $(this).attr(attr, localLink);
      });
    });
  });
  responses.second = $.html();
  return fs.writeFile(htmlFilePath, responses.second);
};

const makeResult = (htmlFilePath, subDirName) => ({
  htmlFilePath,
  subDirName,
  recivedData: responses.second,
});

export default {
  loadHtml,
  fillArrLinks,
  loadSubFiles,
  saveSubFiles,
  replaceLink,
  makeResult,
};
