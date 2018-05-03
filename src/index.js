import workWithNames from './names';
import files from './html&files';

export default (link, output) => {
  const {
    subDirName,
    htmlFilePath,
    outputDirPath,
    makeLocalLink,
    makeSubFileName,
  } = workWithNames(link, output);

  return files.loadHtml(link)
    .then(({ data: html }) => files.fillArrLinks(html, outputDirPath))
    .then(() => files.loadSubFiles(link))
    .then(responsesArray =>
      files.saveSubFiles(responsesArray, makeSubFileName, outputDirPath))
    .then(() => files.replaceLink(makeLocalLink, htmlFilePath))
    .then(() => files.makeResult(htmlFilePath, subDirName))
    .catch((err) => {
      throw err;
    });
};
