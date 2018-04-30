#!/usr/bin/env node
import commander from 'commander';
import loader from '..';

commander
  .version('1.0.0')
  .description('Loading web page.')
  .arguments('<linkPage>')
  .option('-o, --output [path]', 'output path', __dirname)
  .action(linkPage => loader(linkPage, commander.output))
  .parse(process.argv);
