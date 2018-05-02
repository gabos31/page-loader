import nock from 'nock';
import axios from 'axios';
import fs from 'mz/fs';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import os from 'os';
import loader from '../src';

axios.defaults.adapter = httpAdapter;

describe('Page loader', () => {
  it('test html', async () => {
    const pathname = '/gabos31/project-lvl3-s238';
    const host = 'https://github.com';
    const expectedFileName = 'github-com-gabos31-project-lvl3-s238.html';
    const expectedDirName = 'github-com-gabos31-project-lvl3-s238_files';
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const {
      htmlFilePath,
      subDirName,
      recivedData,
    } = await loader(`${host}${pathname}`, newTmpDir);
    const savedData = await fs.readFile(htmlFilePath, 'utf-8');
    nock(host).get(pathname).reply(200, recivedData);

    const response = await axios.get(`${host}${pathname}`);
    expect(path.basename(htmlFilePath)).toBe(expectedFileName);
    expect(subDirName).toBe(expectedDirName);
    expect(savedData).toBe(response.data);
  });
});
