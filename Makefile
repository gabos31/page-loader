install:
	npm install
start:
	npm run babel-node -- src/bin/loader.js --output /__test https://github.com/gabos31/project-lvl3-s238
publish:
	npm publish
build:
	npm run-script build
lint:
	npm run eslint .
test:
	npm test
debug:
	DEBUG=page-loader:* npm test
watch:
	npm test -- --watch
test-coverage:
	npm test -- --coverage
