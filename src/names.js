import url from 'url';
import { join, parse, basename } from 'path';
import _ from 'lodash';
import debug from 'debug';

const debugNames = debug('page-loader:names.js');

export default (link, output) => {
  debugNames('path to output directory %o', output);
  const { hostname, pathname } = url.parse(link);

  const makeFileName = (path, ext, host = '') =>
    `${_.compact([...host.split('.'), ...path.split('/')]).join('-')}${ext}`;

  const makeSubFileName = (directory, localLink) => {
    const { dir, name, ext } = parse(localLink);
    const result = join(directory, makeFileName(`${dir}/${name}`, ext));
    return result;
  };

  const subDirName = makeFileName(pathname, '_files', hostname);
  const htmlFilePath = join(output, makeFileName(pathname, '.html', hostname));
  debugNames('html filename after saving %o', basename(htmlFilePath));
  const outputDirPath = join(output, subDirName);
  debugNames('path to sub files directory %o', outputDirPath);
  const makeLocalLink = (linkName) => {
    const result = `./${makeSubFileName(subDirName, linkName)}`;
    debugNames('sub file name %o', basename(result));
    debugNames(`link after replacement to sub file ${basename(result)} %o`, result);
    return result;
  };

  return {
    subDirName,
    htmlFilePath,
    outputDirPath,
    makeLocalLink,
    makeSubFileName,
  };
};
