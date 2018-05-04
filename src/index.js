import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import { join, parse, basename } from 'path';
import _ from 'lodash';

const debugIndex = debug('page-loader:index.js');

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
  debugIndex('asset file name %o', basename(newLink));
  debugIndex(`link after replacement to asset file ${basename(newLink)} %o`, newLink);
  return newLink;
};

const tags = ['img', 'link', 'script'];
debugIndex('tags for replacement %o', tags.toString());
const attrs = { link: 'href', img: 'src', script: 'src' };

const loadHtml = link => axios.get(link);

const extractAssetsUrlsFromHtml = (html, tag) => {
  const links = [];
  const $ = cheerio.load(html);
  $(tag).each(function f() {
    const address = $(this).attr(attrs[tag]);
    if (address && url.parse(address).protocol === null) {
      debugIndex('original link for replacement %o', address);
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

const getAssetsLinksList = (assetsUrlsObject) => {
  const linksList = _.flatten(_.values(assetsUrlsObject));
  return linksList;
};

const makeAssetsDirectory = (path, name, assetsUrlsObject) => {
  const assetsLinksList = getAssetsLinksList(assetsUrlsObject);
  const flag = assetsLinksList.length > 0;
  return flag ? fs.mkdir(join(path, name)) : null;
};

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

const saveAssets = (dataArray, assetsUrlsObject, assetsPath) => {
  const assetsLinksList = getAssetsLinksList(assetsUrlsObject);
  const promises = dataArray.map(({ data }, index) =>
    data.pipe(fs.createWriteStream(makeAssetFilePath(
      assetsPath,
      assetsLinksList[index],
    ))));
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

const makeResult = (newHtml, htmlFilePath, assetsDirName) =>
  Promise.resolve({
    htmlFilePath,
    assetsDirName,
    newHtml,
  });


export default (link, output) => {
  const { hostname, pathname } = url.parse(link);
  const assetsDirName = makeName(pathname, '_files', hostname);
  const htmlFilePath = join(output, makeName(pathname, '.html', hostname));
  debugIndex('path to saved html %o', htmlFilePath);
  const assetsPath = join(output, assetsDirName);
  debugIndex('path to assets %o', `${assetsPath}/`);

  const html = {};
  let linksObj;

  return loadHtml(link)
    .then(({ data }) => {
      html.old = data;
      const assetsUrlsObject = makeAssetsUrlsObject(data);
      linksObj = { ...assetsUrlsObject };
      makeAssetsDirectory(output, assetsDirName, assetsUrlsObject);
      return assetsUrlsObject;
    })
    .then(assetsUrlsObject => loadAssets(link, assetsUrlsObject))
    .then(responsesArray =>
      saveAssets(responsesArray, linksObj, assetsPath))
    .then(() => {
      const changedHtml = replaceAssetsLinks(html.old, linksObj, assetsDirName);
      html.new = changedHtml;
      return saveChangedHtmlFile(htmlFilePath, changedHtml);
    })
    .then(() => makeResult(html.new, htmlFilePath, assetsDirName))
    .catch((err) => {
      throw err;
    });
};
