describe('Class: ModelInstance', function() {
  beforeEach(module('sm.models'));

  beforeEach(inject(function($q, $rootScope, SMModelInstance) {
    this.$rootScope = $rootScope;
    this.testRawModel = {
      a: 1,
    };
    this.testModelPath = '/a/b/c';
    this.listPath = '/a/b/?list=true';
    this.testModelDataRetriever = {
      save: jasmine.createSpy('save').and.returnValue($q.when()),
      delete: jasmine.createSpy('delete'),
    };
    this.testModel = new SMModelInstance({
      rawModel: this.testRawModel,
      modelDataRetriever: this.testModelDataRetriever,
      modelPath: this.testModelPath,
      listPath: this.listPath,
      idField: 'id',
    });
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

  it('should have a merge method that merges in model properties', function() {
    this.testModel.merge({b: 2});
    expect(this.testModel.props).toEqual({a: 1, b: 2});
  });

  it('should have a delete method that deletes the model', function() {
    this.testModel.delete();
    expect(this.testModelDataRetriever.delete).toHaveBeenCalledWith(this.testModelPath, this.listPath, 'id');
  });
});
