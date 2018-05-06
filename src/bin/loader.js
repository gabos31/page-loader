#!/usr/bin/env node
import commander from 'commander';
import htmlLoad from '..';

commander
  .version('1.0.0')
  .description('Loading web page.')
  .arguments('<linkPage>')
  .option('-o, --output [path]', 'output path', '.')
  .action((linkPage) => {
    htmlLoad(linkPage, commander.output)
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  })
  .parse(process.argv);
