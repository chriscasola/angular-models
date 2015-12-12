/* eslint-disable no-var */

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
  src: 'src/**/*.ts',
  test: 'test/**/*.spec.js',
  coverage: 'coverage/',
};

var lintPipeline = lazypipe()
    .pipe(plugins.eslint)
    .pipe(plugins.eslint.format)
    .pipe(plugins.eslint.failAfterError);

gulp.task('clean', function(done) {
  del([config.dest], function() {
    del([config.coverage], done);
  });
});

gulp.task('hint', function() {
  return gulp.src(['./*.js'])
    .pipe(lintPipeline());
});

function getSourcePipeline(concatFilename) {
  return lazypipe()
    .pipe(lintPipeline)
    .pipe(plugins.sourcemaps.init)
    .pipe(plugins.babel, {externalHelpers: true})
    .pipe(plugins.wrapJs, '(function() { %= body % })()')
    .pipe(plugins.babelHelpers, 'babelHelpers.js', 'var')
    .pipe(plugins.order, ['src/module.js'])
    .pipe(plugins.concat, concatFilename)
    .pipe(plugins.wrapJs, '(function() { %= body % })()')
    .pipe(plugins.sourcemaps.write, './');
}

function getTypeScriptPipeline() {
  var tsStream;
  var jsStream;
  var dtsStream;

  tsStream = plugins.typescript({
    module: 'commonjs',
    target: 'es5',
    noImplicitAny: false,
    declaration: true,
    noExternalResolve: true,
    sortOutput: true,
  });

  gulp.src(['src/**/*.ts', 'typings/**/*'])
    .pipe(plugins.sourcemaps.init())
    .pipe(tsStream);

  jsStream = tsStream.js
    .pipe(plugins.concat('angular-smarter-models.js'))
    .pipe(plugins.sourcemaps.write('./'));

  dtsStream = tsStream.dts
    .pipe(plugins.concat('angular-smarter-models.d.ts'))
    .pipe(plugins.stripLine(['// <reference']))
    .pipe(plugins.removeEmptyLines());

  return mergeStream(jsStream, dtsStream);
}

gulp.task( 'build', ['clean'], function() {
  return getTypeScriptPipeline()
    .pipe(gulp.dest(config.dest))
    .pipe(plugins.ignore.exclude(/.js.map/))
    .pipe(plugins.ignore.exclude(/.d.ts/))
    .pipe(plugins.rename({extname: '.min.js'}))
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
      'dist/angular-smarter-models.js',
      'dist/angular-smarter-models.spec.js',
    ];
    karmaConfig.preprocessors = {
      'dist/angular-smarter-models.js': ['coverage'],
    };
    karmaConfig.reporters = ['coverage'];
  }
  new KarmaServer(karmaConfig, done).start();
}

gulp.task('test-deps', ['clean'], function() {
  var bowerDeps = gulp.src('./bower.json')
    .pipe(plugins.mainBowerFiles({includeDev: true}))
    .pipe(plugins.rename({dirname: 'deps'}));

  var testFiles = gulp.src([config.test], {base: './'})
    .pipe(getSourcePipeline('angular-smarter-models.spec.js')());

  return mergeStream(testFiles, bowerDeps)
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
