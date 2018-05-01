install:
	npm install
start:
	npm run babel-node -- src/bin/loader.js https://nodejs.org/api/url
publish:
	npm publish
build:
	npm run-script build
lint:
	npm run eslint .
test:
	npm test
watch:
	npm test -- --watch
test-coverage:
	npm test -- --coverage
