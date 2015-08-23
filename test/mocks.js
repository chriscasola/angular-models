function baseThey(msg, vals, spec, itFn) {
  var valsIsArray = angular.isArray(vals);

  angular.forEach(vals, function(val, key) {
    var m = msg.replace(/\$prop/g, angular.toJson(valsIsArray ? val : key));
    itFn(m, function() {
      /* jshint -W040 : ignore possible strict violation due to use of this */
      spec.call(this, val);
    });
  });
}

window.they = function(msg, vals, spec) {
  baseThey(msg, vals, spec, it);
};

window.tthey = function(msg, vals, spec) {
  baseThey(msg, vals, spec, iit);
};

window.xthey = function(msg, vals, spec) {
  baseThey(msg, vals, spec, xit);
};
