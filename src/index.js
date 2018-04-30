import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import _ from 'lodash';

const loader = (link, output) => {
  const { hostname, pathname } = url.parse(link, true);
  const fileName = `${_.compact([...hostname.split('.'),
    ...pathname.split('/')]).join('-')}.html`;
  const outputFileName = path.join(output, fileName);
  return axios.get(link)
    .then((response) => {
      fs.writeFile(outputFileName, response.data);
      return response.data;
    })
    .then(res => ({ outputFileName, recivedData: res }))
    .catch(err => console.log(err));
};

export default loader;
