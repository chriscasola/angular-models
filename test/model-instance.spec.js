describe('Class: ModelInstance', function() {
  beforeEach(module('sm.models'));

  beforeEach(inject(function($q, $rootScope, SMModelInstance) {
    this.$rootScope = $rootScope;
    this.testRawModel = {
      a: 1,
    };
    this.testModelPath = '/a/b/c';
    this.testModelDataRetriever = {
      save: jasmine.createSpy('save').and.returnValue($q.when()),
    };
    this.testModel = new SMModelInstance(this.testRawModel, this.testModelDataRetriever, this.testModelPath);
  }));

  describe('Property: props', function() {
    it('should be the raw model object', function() {
      expect(this.testModel.props).toBe(this.testRawModel);
    });
  });

  it('should have a serialize method that returns the model data in string form', function() {
    expect(this.testModel.serialize()).toEqual(JSON.stringify(this.testRawModel));
  });

  it('should have a save method that calls save on the model data retriever', function(done) {
    this.testModel.save().then(() => {
      expect(this.testModelDataRetriever.save).toHaveBeenCalledWith(this.testModel);
      done();
    });
    this.$rootScope.$apply();
  });

  it('should let the model path be set', function() {
    this.testModel.setModelPath('/d/e/f');
    expect(this.testModel.getModelPath()).toEqual('/d/e/f');
  });
});
