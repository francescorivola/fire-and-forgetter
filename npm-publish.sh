npm set init.author.name "Francesco Rivola"
npm set init.author.email "$NPM_AUTHOR_EMAIL"
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
npm publish --access=public
