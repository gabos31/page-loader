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
    const pathname = '/courses';
    const host = 'https://hexlet.io';
    const expectedFileName = 'hexlet-io-courses.html';
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const {
      outputFileName,
      recivedData,
    } = await loader(`${host}${pathname}`, newTmpDir);
    const savedData = await fs.readFile(outputFileName, 'utf-8');
    nock(host).get(pathname).reply(200, recivedData);

    const response = await axios.get(`${host}${pathname}`);
    expect(path.basename(outputFileName)).toBe(expectedFileName);
    expect(savedData).toBe(response.data);
  });
});
