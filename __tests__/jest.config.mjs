// jest.config.mjs
export default {
  moduleFileExtensions: [
	"mjs",
	"js",
],
  testEnvironment: 'node',
  roots: ['<rootDir>/'],
  transform: {},                    // no Babel
  extensionsToTreatAsEsm: ['.js'],  // treat .js as ESM
};

