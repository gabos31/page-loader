import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import { join, parse, resolve } from 'path';
import _ from 'lodash';
import Listr from 'listr';

const debugIndex = debug('page-loader:index');

const makeName = (link, pathname, ext, hostname = '') => {
  try {
    const name = `${_.compact([...hostname.split('.'), ...pathname.split('/')]).join('-')}${ext}`;
    return name;
  } catch (err) {
    const message = `Error, incorrect url '${link}'.`;
    throw message;
  }
};

const makeAssetFilePath = (savePath, pathname) => {
  const { dir, name, ext } = parse(pathname);
  const assetName = makeName(pathname, `${dir}/${name}`, ext);
  const assetFilePath = join(savePath, assetName);
  return assetFilePath;
};

const makeLocalLink = (assetsDirectory, oldLink) => {
  const assetPath = makeAssetFilePath(assetsDirectory, oldLink);
  const newLink = `./${assetPath}`;
  debugIndex('link after replacement %o', newLink);
  return newLink;
};

const getAssetsLinksList = (assetsUrlsObject) => {
  const linksList = _.flatten(_.values(assetsUrlsObject));
  return linksList;
};

const tags = ['img', 'link', 'script'];
debugIndex('tags for replacement %o', tags.toString());
const attrs = { link: 'href', img: 'src', script: 'src' };

const getResultHttpRequest = ({ status, data }, link) => {
  if (status === 200) {
    return data;
  }
  const message = `Expected response code '200', but was '${status}' for '${link}'`;
  throw new Error(message);
};

const loadHtml = (link, output) => {
  if (!fs.existsSync(output)) {
    const message = `Error, path '${output}' does not exist.`;
    return Promise.reject(new Error(message));
  }
  return axios.get(link);
};

const extractAssetsUrlsFromHtml = (html, tag) => {
  const links = [];
  const $ = cheerio.load(html);
  $(tag).each(function getLinkfromAttr() {
    const address = $(this).attr(attrs[tag]);
    if (address && url.parse(address).protocol === null) {
      debugIndex('link befor replacement %o', address);
      links.push(address);
    }
  });
  return links;
};

const makeAssetsUrlsObject = html =>
  tags.reduce((acc, tag) => {
    const assetsUrlsArr = extractAssetsUrlsFromHtml(html, tag);
    return { ...acc, [tag]: assetsUrlsArr };
  }, {});

const makeAssetsDirectory = (path, name, linksObj) => {
  const linksArr = getAssetsLinksList(linksObj);
  if (linksArr.length > 0) {
    return fs.mkdir(resolve(path, name));
  }
  return Promise.resolve();
};

const makeFullLink = (link, pathname) => {
  const { origin } = new url.URL(link);
  return url.resolve(origin, pathname);
};

const loadAsset = link =>
  axios.get(link, { responseType: 'stream' });

const saveAsset = (data, assetPath) =>
  Promise.resolve(data.pipe(fs.createWriteStream(assetPath)));

const replaceAssetsLinks = (html, assetsUrlsObject, assetsDirName) => {
  const $ = cheerio.load(html);
  tags.forEach((tag) => {
    assetsUrlsObject[tag].forEach((link) => {
      const localLink = makeLocalLink(assetsDirName, link);
      const attr = attrs[tag];
      $(`${tag}[${attr}='${link}']`).each(function changeLink() {
        $(this).attr(attr, localLink);
      });
    });
  });
  return $.html();
};

const saveChangedHtmlFile = (path, changedHtml) =>
  fs.writeFile(path, changedHtml, 'utf-8');

const processError = (error) => {
  const { code, path, config } = error;
  if (path) {
    const message = `Error '${code}'. Check the path and permissions to '${path}'`;
    throw new Error(message);
  }
  if (config) {
    const message = [`Access error (code '${code || error.response.status}')`,
      ` to resource '${config.url}'.`,
      ' Check the network settings and the correctness of url.'].join('');
    throw new Error(message);
  }
  throw error;
};

const makeListrTask = (link, pathname, assetsPath) => {
  const currentLink = makeFullLink(link, pathname);
  const assetPath = makeAssetFilePath(assetsPath, pathname);
  const task = async () => {
    const { data, status } = await loadAsset(currentLink);
    if (status === 200) {
      await saveAsset(data, assetPath);
      return Promise.resolve();
    }
    const message = ['Expected response code \'200\', ',
      `but was '${status}' for '${currentLink}'`].join('');
    return Promise.reject(new Error(message));
  };
  return { title: currentLink, task };
};

const makeListrTasksArr = (linksArr, link, assetsPath) =>
  linksArr.map(pathname =>
    makeListrTask(link, pathname, assetsPath));

const downloadAssets = (link, linksObj, assetsPath, output) => {
  const linksArr = getAssetsLinksList(linksObj);
  if (linksArr.length > 0) {
    const listrTasksArr = makeListrTasksArr(linksArr, link, assetsPath);
    const title = `Downloading ${link} to ${resolve(output)}`;
    const task = () => new Listr(listrTasksArr, { concurrent: true });
    const tasks = new Listr([{ title, task }]);
    return tasks.run();
  }
  return Promise.resolve();
};

export default async (link, output) => {
  const { hostname, pathname } = url.parse(link);
  const assetsDirName = makeName(link, pathname, '_files', hostname);
  const htmlFilePath = resolve(output, makeName(link, pathname, '.html', hostname));
  debugIndex('path to saved html %o', htmlFilePath);
  const assetsPath = resolve(output, assetsDirName);
  debugIndex('path to assets %o', `${assetsPath}/`);

  try {
    const response = await loadHtml(link, output);
    const html = getResultHttpRequest(response, link);
    const linksObj = makeAssetsUrlsObject(html);
    await makeAssetsDirectory(output, assetsDirName, linksObj);
    await downloadAssets(link, linksObj, assetsPath, output);
    const changedHtml = replaceAssetsLinks(html, linksObj, assetsDirName);
    await saveChangedHtmlFile(htmlFilePath, changedHtml);
  } catch (err) {
    return processError(err);
  }
  return Promise.resolve();
};
