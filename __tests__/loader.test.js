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
const originalHtmlPath = `${fixtruresSrc}original/${modifedName}.html`;
const asset1 = '/opensearch.xml';
const asset2 = '/manifest.json';
const asset1Path = `${fixtruresSrc}original/${modifedName}_files${asset1}`;
const asset2Path = `${fixtruresSrc}original/${modifedName}_files${asset2}`;

describe.only('page-loader', () => {
  it('correct replacement of links', async () => {
    const expectedHtmlPath = `${fixtruresSrc}changed/${modifedName}.html`;
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const changedHtmlPath = path.join(newTmpDir, `${modifedName}.html`);
    const expectedHtml = await fs.readFile(expectedHtmlPath, 'utf-8');
    const asset1Data = await fs.readFile(asset1Path);
    const asset2Data = await fs.readFile(asset2Path);
    const originalHtml = await fs.readFile(originalHtmlPath, 'utf-8');

    nock(host).get(pathname).reply(200, originalHtml);
    nock(host).get(asset1).reply(200, asset1Data);
    nock(host).get(asset2).reply(200, asset2Data);

    await htmlLoad(`${host}${pathname}`, newTmpDir);
    const changedHtml = await fs.readFile(changedHtmlPath, 'utf-8');

    expect(changedHtml).toBe(expectedHtml);
  });
  it('http response code is not 200 for html', async () => {
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const expectedErr = new Error(`Expected response code '200', but was '201' for '${host}${pathname}'`);

    nock(host).get(pathname).reply(201);

    await expect(htmlLoad(`${host}${pathname}`, newTmpDir))
      .rejects.toEqual(expectedErr);
  });
  it('http response code is not 200 for asset', async () => {
    const expectedErr = new Error(`Expected response code '200', but was '205' for '${host}${asset1}'`);
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const originalHtml = await fs.readFile(originalHtmlPath, 'utf-8');

    nock(host).get(pathname).reply(200, originalHtml);
    nock(host).get(asset1).reply(205);
    nock(host).get(asset2).reply(205);

    await expect(htmlLoad(`${host}${pathname}`, newTmpDir))
      .rejects.toEqual(expectedErr);
  });
  it('incorrect url', async () => {
    const newTmpDir = await fs.mkdtemp(`${os.tmpdir()}${path.sep}`);
    const incorrectHost = 'https://eqweeeq.ru';
    const incorrectPath = '/sdfdsaas3';
    const expectedMsg = [`Access error (code 'ENOTFOUND') to resource '${incorrectHost}${incorrectPath}'.`,
      ' Check the network settings and the correctness of url.'].join('');
    const expectedErr = new Error(expectedMsg);

    await expect(htmlLoad(`${incorrectHost}${incorrectPath}`, newTmpDir))
      .rejects.toEqual(expectedErr);
  });
  it('incorrect output path', async () => {
    const incorrectPath = '/atatata';
    const expectedErr = new Error(`Error, path '${incorrectPath}' does not exist.`);
    const originalHtml = await fs.readFile(originalHtmlPath, 'utf-8');

    nock(host).get(pathname).reply(200, originalHtml);

    await expect(htmlLoad(`${host}${pathname}`, incorrectPath))
      .rejects.toEqual(expectedErr);
  });
});
