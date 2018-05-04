import nock from 'nock';
import axios from 'axios';
import fs from 'mz/fs';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import os from 'os';
import htmlLoad from '../src';

axios.defaults.adapter = httpAdapter;

const host = 'https://github.com';
const pathname = '/gabos31/project-lvl3-s238';
const modifedName = 'github-com-gabos31-project-lvl3-s238';
const fixtruresSrc = './__tests__/__fixtures__/';

beforeEach(async () => {
  const asset1 = '/opensearch.xml';
  const asset2 = '/manifest.json';
  const originalHtmlPath = `${fixtruresSrc}original/${modifedName}.html`;
  const asset1Path = `${fixtruresSrc}original/${modifedName}_files${asset1}`;
  const asset2Path = `${fixtruresSrc}original/${modifedName}_files${asset2}`;

  const asset1Data = await fs.readFile(asset1Path);
  const asset2Data = await fs.readFile(asset2Path);
  const originalHtml = await fs.readFile(originalHtmlPath, 'utf-8');

  nock(host).get(pathname).reply(200, originalHtml);
  nock(host).get(asset1).reply(200, asset1Data);
  nock(host).get(asset2).reply(200, asset2Data);
});

describe('page-loader', () => {
  it('test for correct replacement of links', async () => {
    const expectedHtmlPath = `${fixtruresSrc}changed/${modifedName}.html`;
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const changedHtmlPath = path.join(newTmpDir, `${modifedName}.html`);
    const expectedHtml = await fs.readFile(expectedHtmlPath, 'utf-8');

    await htmlLoad(`${host}${pathname}`, newTmpDir);
    const changedHtml = await fs.readFile(changedHtmlPath, 'utf-8');

    expect(changedHtml).toBe(expectedHtml);
  });
});
