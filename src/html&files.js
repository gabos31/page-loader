import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import cheerio from 'cheerio';

const arrLinks = [];
const responses = {};
const tags = ['img', 'link', 'script'];
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
        arrays[tag].push(address);
      }
    });
    arrLinks.push(...arrays[tag]);
  });
  return fs.mkdir(outputDirPath);
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

const makeResult = (htmlFilePath, subDirName) => Promise.resolve({
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
