import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import { join, parse, dirname } from 'path';
import _ from 'lodash';

const debugIndex = debug('page-loader:index');

const makeName = (pathname, ext, hostname = '') =>
  `${_.compact([...hostname.split('.'), ...pathname.split('/')]).join('-')}${ext}`;

const makeAssetFilePath = (savePath, link) => {
  const { dir, name, ext } = parse(link);
  const assetName = makeName(`${dir}/${name}`, ext);
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
    return Promise.resolve(data);
  }
  const message = `Expected response code 200, but was ${status} for ${link}`;
  return Promise.reject(message);
};

const loadHtml = link => axios.get(link);

const extractAssetsUrlsFromHtml = (html, tag) => {
  const links = [];
  const $ = cheerio.load(html);
  $(tag).each(function f() {
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
    const assetsUrls = extractAssetsUrlsFromHtml(html, tag);
    return { ...acc, [tag]: assetsUrls };
  }, {});

const makeAssetsDirectory = (path, name) =>
  fs.mkdir(join(path, name));

const loadAssets = (link, assetsUrlsObject) => {
  const assetsLinksList = getAssetsLinksList(assetsUrlsObject);
  const { origin } = new url.URL(link);
  const promises = assetsLinksList
    .map(address => axios.get(
      `${origin}${address}`,
      { responseType: 'stream' },
    ));
  return Promise.all(promises);
};

const saveAssets = (dataArray, assetsUrlsObject, assetsPath, link) => {
  const { origin } = new url.URL(link);
  const assetsLinksList = getAssetsLinksList(assetsUrlsObject);
  const promises = dataArray.map(({ data, status }, index) => {
    if (status === 200) {
      return data.pipe(fs.createWriteStream(makeAssetFilePath(
        assetsPath,
        assetsLinksList[index],
      )));
    }
    const message = ['Expected response code 200, ',
      `but was ${status} for ${origin}${assetsLinksList[index]}`].join('');
    return Promise.reject(message);
  });
  return Promise.all(promises);
};

const replaceAssetsLinks = (html, assetsUrlsObject, assetsDirName) => {
  const $ = cheerio.load(html);
  tags.forEach((tag) => {
    assetsUrlsObject[tag].forEach((link) => {
      const localLink = makeLocalLink(assetsDirName, link);
      const attr = attrs[tag];
      $(`${tag}[${attr}='${link}']`).each(function f() {
        $(this).attr(attr, localLink);
      });
    });
  });
  return $.html();
};

const saveChangedHtmlFile = (path, changedHtml) =>
  fs.writeFile(path, changedHtml);

const makeErrDescription = (error) => {
  const { code, path, config } = error;
  if (path) {
    const message = `Error ${code}. Check the path and permissions to ${dirname(path)}`;
    throw message;
  }
  if (config) {
    const message = [`Access error (code ${code || error.response.status}) to resource ${config.url}.`,
      ' Check the network settings and the correctness of url.'].join('');
    throw message;
  }
  throw error;
};

export default (link, output) => {
  const { hostname, pathname } = url.parse(link);
  const assetsDirName = makeName(pathname, '_files', hostname);
  const htmlFilePath = join(output, makeName(pathname, '.html', hostname));
  debugIndex('path to saved html %o', htmlFilePath);
  const assetsPath = join(output, assetsDirName);
  debugIndex('path to assets %o', `${assetsPath}/`);

  let html;
  let linksObj;

  return loadHtml(link)
    .then(response => getResultHttpRequest(response, link))
    .then((data) => {
      html = data;
      const assetsUrlsObject = makeAssetsUrlsObject(data);
      linksObj = { ...assetsUrlsObject };
      return makeAssetsDirectory(output, assetsDirName);
    })
    .then(() => loadAssets(link, linksObj))
    .then(responsesArray =>
      saveAssets(responsesArray, linksObj, assetsPath, link))
    .then(() => {
      const changedHtml = replaceAssetsLinks(html, linksObj, assetsDirName);
      return saveChangedHtmlFile(htmlFilePath, changedHtml);
    })
    .catch(err => makeErrDescription(err));
};
