install:
	npm install
start:
	npm run babel-node -- src/bin/gendiff.js -f json __tests__/__fixtures__/tree-before.ini __tests__/__fixtures__/tree-after.ini
publish:
	npm publish
lint:
	npm run eslint .
test:
	npm test
test-coverage:
	npm test --coverage
watch:
	node_modules/jest/bin/jest.js --watch
