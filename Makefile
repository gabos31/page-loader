install:
	npm install
start:
	npm run babel-node -- src/bin/loader.js --output ./__tests__/__fixtures__ https://github.com/gabos31/project-lvl3-s238
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
