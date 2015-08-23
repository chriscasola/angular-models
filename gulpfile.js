var gulp = require('gulp');
var del = require('del');
var path = require('path');
var mergeStream = require('merge-stream');
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

gulp.task('clean', function(done) {
  del([config.dest], function() {
    del([config.coverage], done);
  });
});

gulp.task('hint-mocks', function() {
  return gulp.src(['test/**/*.js', '!test/**/*.spec.js'])
    .pipe(plugins.debug())
    .pipe(plugins.eslint({
      globals: {
        'describe': true,
        'it': true,
        'expect': true,
        'inject': true,
        'beforeEach': true,
        'module': true,
        'jasmine': true,
        'they': true,
        'iit': true,
        'xit': true,
      },
      rules: {
        'no-var': 0,
      },
    }))
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
});

gulp.task('hint-build', function() {
  return gulp.src(['./*.js'])
    .pipe(plugins.debug())
    .pipe(plugins.eslint({
      rules: {
        'no-var': 0,
      },
    }))
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
});

gulp.task('hint', ['hint-mocks', 'hint-build']);

function sourceFileStream() {
  return gulp.src([config.src], {base: './'})
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError())
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel({externalHelpers: true}))
    .pipe(plugins.wrapJs('(function() { %= body % })()'))
    .pipe(plugins.babelHelpers('babelHelpers.js', 'var'))
    .pipe(plugins.order(['src/module.js']))
    .pipe(plugins.concat('angular-smarter-models.js'))
    .pipe(plugins.wrapJs('(function() { %= body % })()'))
    .pipe(plugins.sourcemaps.write('./'));
}

gulp.task( 'build', ['clean'], function() {
  return sourceFileStream()
    .pipe(gulp.dest(config.dest))
    .pipe(plugins.ignore.exclude(/.js.map/))
    .pipe(plugins.rename({ extname: '.min.js' }))
    .pipe(plugins.uglify())
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest(config.dest));
});

function testFileStream() {
  return gulp.src([config.test], {base: './'})
    .pipe(plugins.eslint({
      globals: {
        'describe': true,
        'it': true,
        'expect': true,
        'inject': true,
        'beforeEach': true,
        'module': true,
        'jasmine': true,
        'they': true,
        'iit': true,
        'xit': true,
      },
    }))
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError())
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel({externalHelpers: true}))
    .pipe(plugins.wrapJs('(function() { %= body % })()'))
    .pipe(plugins.babelHelpers('babelHelpers.js', 'var'))
    .pipe(plugins.concat('angular-smarter-models.spec.js'))
    .pipe(plugins.sourcemaps.write('./'));
}

function dependencyStream() {
  var bowerDeps = gulp.src('./bower.json')
    .pipe(plugins.mainBowerFiles({includeDev: true}));

  return mergeStream(bowerDeps, gulp.src(['node_modules/gulp-babel/node_modules/babel-core/browser-polyfill.js']));
}

gulp.task('test', ['build', 'coverage'], function() {
  var sourceStream = gulp.src(['dist/angular-smarter-models.min.js']);
  return mergeStream(dependencyStream(), sourceStream, testFileStream(), gulp.src('test/mocks.js', {base: './'}))
    .pipe(plugins.order(['**/*angular.js', 'dist/**/*.js', 'test/mocks.js']))
    .pipe(plugins.jasmineBrowser.specRunner({ console: true }))
    .pipe(plugins.jasmineBrowser.headless());
});

gulp.task('jasmine', function() {
  return mergeStream(dependencyStream(), sourceFileStream(), testFileStream(), gulp.src('test/mocks.js', {base: './'}))
    .pipe(plugins.order(['**/*angular.js', 'src/**/*.js', 'test/mocks.js']))
    .pipe(plugins.jasmineBrowser.specRunner())
    .pipe(plugins.jasmineBrowser.server({port: 8888}));
});

gulp.task('coverage', ['build'], function(done) {
  var sourceStream = gulp.src([config.src], {base: './'})
    .pipe(plugins.babel())
    .pipe(plugins.wrapJs('(function() { %= body % })()'));

  var testStream = testFileStream()
    .pipe(plugins.rename({dirname: 'test'}));

  var depStream = dependencyStream()
    .pipe(plugins.rename({dirname: 'deps'}));

  mergeStream(depStream, sourceStream, testStream)
    .pipe(plugins.ignore.exclude(/.js.map/))
    .pipe(gulp.dest(config.coverage + '/files/'))
    .on('end', function() {
      new KarmaServer({
        configFile: path.join(__dirname, '/karma.conf.js'),
      }, done).start();
    });
});

gulp.task('default', ['test', 'hint']);
