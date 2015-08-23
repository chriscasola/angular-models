var gulp = require('gulp');
var del = require('del');
var path = require('path');
var mergeStream = require('merge-stream');
var lazypipe = require('lazypipe');
var KarmaServer = require('karma').Server;
var plugins = require('gulp-load-plugins')({
  rename: {
    'gulp-babel-external-helpers': 'babelHelpers',
  },
});

var config = {
  dest: 'dist/',
  src: 'src/**/*.js',
  test: 'test/**/*.spec.js',
  coverage: 'coverage/',
};

var testLintOverrides = {
  globals: {
    describe: true,
    it: true,
    expect: true,
    inject: true,
    beforeEach: true,
    afterEach: true,
    module: true,
    jasmine: true,
    they: true,
    iit: true,
    xit: true,
  },
  rules: {
    'no-var': 0,
  },
};

gulp.task('clean', function(done) {
  del([config.dest], function() {
    del([config.coverage], done);
  });
});

function getLintPipeline(overrides) {
  return lazypipe()
    .pipe(plugins.eslint, overrides)
    .pipe(plugins.eslint.format)
    .pipe(plugins.eslint.failAfterError);
}

gulp.task('hint-mocks', function() {
  return gulp.src(['test/**/*.js', '!' + config.test])
    .pipe(getLintPipeline(testLintOverrides)());
});

gulp.task('hint-build', function() {
  return gulp.src(['./*.js'])
    .pipe(getLintPipeline({
      rules: {
        'no-var': 0,
      },
    })());
});

gulp.task('hint', ['hint-mocks', 'hint-build']);

function getSourcePipeline(concatFilename, lintOverrides) {
  return lazypipe()
    .pipe(getLintPipeline(lintOverrides))
    .pipe(plugins.sourcemaps.init)
    .pipe(plugins.babel, {externalHelpers: true})
    .pipe(plugins.wrapJs, '(function() { %= body % })()')
    .pipe(plugins.babelHelpers, 'babelHelpers.js', 'var')
    .pipe(plugins.order, ['src/module.js'])
    .pipe(plugins.concat, concatFilename)
    .pipe(plugins.wrapJs, '(function() { %= body % })()')
    .pipe(plugins.sourcemaps.write, './');
}

gulp.task( 'build', ['clean'], function() {
  return gulp.src([config.src], {base: './'})
    .pipe(getSourcePipeline('angular-smarter-models.js')())
    .pipe(gulp.dest(config.dest))
    .pipe(plugins.ignore.exclude(/.js.map/))
    .pipe(plugins.rename({ extname: '.min.js' }))
    .pipe(plugins.uglify())
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest(config.dest));
});

function runKarmaTests(done, coverage) {
  var karmaConfig = {
    configFile: path.join(__dirname, '/karma.conf.js'),
    singleRun: true,
    autoWatch: false,
    browsers: ['PhantomJS'],
    files: [
      'dist/deps/angular.js',
      'dist/deps/**/*.js',
      'test/mocks.js',
      'dist/angular-smarter-models.min.js',
      'dist/angular-smarter-models.spec.js',
    ],
    preprocessors: {},
  };
  if (coverage) {
    karmaConfig.files = [
      'dist/deps/angular.js',
      'dist/deps/**/*.js',
      'test/mocks.js',
      'src/module.js',
      'src/**/*.js',
      'dist/angular-smarter-models.spec.js',
    ];
    karmaConfig.preprocessors = {
      'src/**/*.js': ['babel', 'coverage'],
    };
    karmaConfig.reporters = ['coverage'];
  }
  new KarmaServer(karmaConfig, done).start();
}

gulp.task('test-deps', ['clean'], function() {
  var bowerDeps = gulp.src('./bower.json')
    .pipe(plugins.mainBowerFiles({includeDev: true}));

  var deps = mergeStream(bowerDeps, gulp.src(['node_modules/gulp-babel/node_modules/babel-core/browser-polyfill.js']))
    .pipe(plugins.rename({dirname: 'deps'}));

  var testFiles = gulp.src([config.test], {base: './'})
    .pipe(getSourcePipeline('angular-smarter-models.spec.js', testLintOverrides)());

  return mergeStream(testFiles, deps)
    .pipe(gulp.dest(config.dest));
});

gulp.task('test', ['build', 'test-deps'], function(done) {
  runKarmaTests(done);
});

gulp.task('coverage', ['build', 'test-deps'], function(done) {
  runKarmaTests(done, true);
});

gulp.task('dev', ['build', 'test'], function() {
  gulp.watch([config.src, config.test], ['build', 'test']);
});

gulp.task('default', ['hint', 'build', 'test', 'coverage']);
