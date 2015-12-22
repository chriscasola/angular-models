describe('Class: Model', function() {
  beforeEach(module('sm.models'));

  beforeEach(inject(function($rootScope, $q, SMModel) {
    this.$rootScope = $rootScope;
    this.MockModelInstance = function(config) {
      this.props = config.rawModel;
      this.mockConfig = config;
    };
    this.mockDataRetriever = {
      get: jasmine.createSpy('get').and.returnValue(new this.MockModelInstance({})),
      getAsync: jasmine.createSpy('getAsync').and.returnValue($q.when(new this.MockModelInstance({}))),
      create: jasmine.createSpy('create').and.returnValue($q.when(new this.MockModelInstance({rawModel: {id: 'tm5'}}))),
      listAsync: jasmine.createSpy('listAsync').and.returnValue($q.when([])),
      list: jasmine.createSpy('list').and.returnValue([]),
      getMultipleAsync: jasmine.createSpy('getMultipleAsync').and.returnValue($q.when([])),
    };
    this.testModel = new SMModel({
      modelPath: '/model/:id',
      listPath: '/model/?list=true',
      idField: 'id',
      ModelInstance: this.MockModelInstance,
      modelDataRetriever: this.mockDataRetriever,
    });
  }));

  it('should return a newly constructed ModelInstance when get is called', function() {
    expect(this.testModel.get() instanceof this.MockModelInstance).toBe(true);
  });

  it('should return a promise that gives a newly constructed ModelInstance when getAsync is called', function(done) {
    this.testModel.getAsync().then(model => {
      expect(model instanceof this.MockModelInstance).toBe(true);
      done();
    });
    this.$rootScope.$apply();
  });

  they('should pass the model path, params, and instance to the model data retriever when $prop is called',
    ['get', 'getAsync', 'getMultipleAsync'], function(method) {
    const testParams = {id: 1};
    this.testModel[method](testParams);
    expect(this.mockDataRetriever[method])
      .toHaveBeenCalledWith('/model/:id', '/model/?list=true', testParams, this.MockModelInstance, 'id');
  });

  they('should pass the list path, model path, params, and id field to the model data retriever when $prop is called',
    ['list', 'listAsync'], function(method) {
    const testParams = {id: 1};
    this.testModel[method](testParams);
    expect(this.mockDataRetriever[method])
      .toHaveBeenCalledWith('/model/?list=true', '/model/:id', testParams, 'id');
  });

  it('should call create on the data retriever with a new model instance when create is called', function(done) {
    const testParams = {a: 1};
    this.testModel.create(testParams).then(model => {
      expect(model.props.id).toEqual('tm5');
      done();
    });
    expect(this.mockDataRetriever.create).toHaveBeenCalledWith('/model/', '/model/?list=true', testParams, jasmine.any(this.MockModelInstance));
    this.$rootScope.$apply();
  });

  it('should resolve with a newly created model when create is called', function(done) {
    const testParams = {a: 1};
    this.testModel.create(testParams).then((modelInstance) => {
      expect(modelInstance.props).toEqual({id: 'tm5'});
      expect(modelInstance instanceof this.MockModelInstance).toBe(true);
      done();
    });
    this.$rootScope.$apply();
  });

  it('should pass the correct properties to the ModelInstance constructor when create is called', function() {
    const testParams = {a: 1};
    const testProps = {url: 'a/b/c'};
    this.testModel.create(testParams, testProps);
    const mockModelInstance = this.mockDataRetriever.create.calls.argsFor(0)[3];
    expect(mockModelInstance.mockConfig).toEqual({
      rawModel: testProps,
      modelDataRetriever: this.mockDataRetriever,
      modelPath: '/model/:id',
      idField: 'id',
    });
  });
});
