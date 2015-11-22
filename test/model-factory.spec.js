describe('Service: ModelFactory', function() {
  beforeEach(module('sm.models'));

  beforeEach(inject(function(smModelFactory) {
    this.modelFactory = smModelFactory;
  }));

  it('should create a model with the given endpoint', function() {
    const model = this.modelFactory('/model/:id').done();
    expect(model.config.modelPath).toEqual('/model/:id');
  });

  it('should create a model with the given list path', function() {
    const model = this.modelFactory('/model/:id', '/model/?list=true').done();
    expect(model.config.listPath).toEqual('/model/?list=true');
  });

  it('should allow the model class to be configured', function() {
    const CustomModel = function() {};
    const model = this.modelFactory('/model/:id')
      .model(CustomModel)
      .done();
    expect(model instanceof CustomModel).toBe(true);
  });

  it('should allow the model instance class to be configured', function() {
    const CustomModelInstance = function() {};
    const model = this.modelFactory('/model/:id')
      .modelInstance(CustomModelInstance)
      .done();
    expect(model.config.ModelInstance).toBe(CustomModelInstance);
  });

  it('should allow the model data retriever class to be configured', function() {
    const customDataRetriever = function() {};
    const model = this.modelFactory('/model/:id')
      .modelDataRetriever(customDataRetriever)
      .done();
    expect(model.config.modelDataRetriever).toBe(customDataRetriever);
  });

  it('should allow the model list path to be configured', function() {
    const customListPath = '/my_list/';
    const model = this.modelFactory('/model/:id')
      .listPath(customListPath)
      .done();
    expect(model.config.listPath).toBe(customListPath);
  });
});
