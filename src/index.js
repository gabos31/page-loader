import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import { join, parse } from 'path';
import _ from 'lodash';
import cheerio from 'cheerio';

const loader = (link, output) => {
  const { hostname, pathname } = url.parse(link);
  const makeFileName = (path, ext, host = '') =>
    `${_.compact([...host.split('.'), ...path.split('/')]).join('-')}${ext}`;
  const htmlFilePath = join(output, makeFileName(pathname, '.html', hostname));
  const subDirName = makeFileName(pathname, '_files', hostname);
  const outputDirPath = join(output, subDirName);
  const makeSubFileName = (directory, localLink) => {
    const { dir, name, ext } = parse(localLink);
    return join(directory, makeFileName(`${dir}/${name}`, ext));
  };
  const makeLocalLink = linkName =>
    `./${makeSubFileName(subDirName, linkName)}`;
  const arrLinks = [];
  const responses = {};
  const attrs = { link: 'href', img: 'src', script: 'src' };
  const arrays = { link: [], img: [], script: [] };
  return axios.get(link)
    .then((res) => {
      responses.first = res.data;
      const $ = cheerio.load(responses.first);
      const fillArray = (tag) => {
        $(tag).each(function f() {
          arrays[tag].push($(this).attr(attrs[tag]));
        });
        arrays[tag] = _.compact(arrays[tag])
          .filter(address => url.parse(address).protocol === null);
      };
      fillArray('link');
      fillArray('img');
      fillArray('script');
      arrLinks.push(...arrays.link, ...arrays.script, ...arrays.img);
      return fs.mkdir(outputDirPath);
    })
    .then(() => {
      const { origin } = new url.URL(link);
      const promises = arrLinks.map(item => axios({
        method: 'get',
        url: `${origin}${item}`,
        responseType: 'stream',
      }));
      return Promise.all(promises);
    })
    .then((res) => {
      const promises = res.map(({ data }, index) =>
        data.pipe(fs.createWriteStream(makeSubFileName(
          outputDirPath,
          arrLinks[index],
        ))));
      return Promise.all(promises);
    })
    .then(() => {
      const $ = cheerio.load(responses.first);
      const replaceLink = (tag) => {
        arrays[tag].forEach((item) => {
          const localLink = makeLocalLink(item);
          const attr = attrs[tag];
          $(`${tag}[${attr}='${item}']`).each(function f() {
            $(this).attr(attr, localLink);
          });
        });
      };
      replaceLink('link');
      replaceLink('img');
      replaceLink('script');
      responses.second = $.html();
      return fs.writeFile(htmlFilePath, responses.second);
    })
    .then(() => Promise.resolve({
      htmlFilePath,
      subDirName,
      recivedData: responses.second,
    }))
    .catch(err => new Error(err));
};

export default loader;
