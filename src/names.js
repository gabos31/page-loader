import url from 'url';
import { join, parse } from 'path';
import _ from 'lodash';

export default (link, output) => {
  const { hostname, pathname } = url.parse(link);

  const makeFileName = (path, ext, host = '') =>
    `${_.compact([...host.split('.'), ...path.split('/')]).join('-')}${ext}`;

  const makeSubFileName = (directory, localLink) => {
    const { dir, name, ext } = parse(localLink);
    return join(directory, makeFileName(`${dir}/${name}`, ext));
  };

  const subDirName = makeFileName(pathname, '_files', hostname);

  const htmlFilePath = join(output, makeFileName(pathname, '.html', hostname));

  const outputDirPath = join(output, subDirName);

  const makeLocalLink = linkName =>
    `./${makeSubFileName(subDirName, linkName)}`;

  return {
    subDirName,
    htmlFilePath,
    outputDirPath,
    makeLocalLink,
    makeSubFileName,
  };
};
