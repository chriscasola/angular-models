class Model {
  constructor(modelPath, ModelInstance, modelDataRetriever ) {
    this.ModelInstance = ModelInstance;
    this.modelPath = modelPath;
    this.modelDataRetriever = modelDataRetriever;
  }

  get(params) {
    return this.modelDataRetriever.get(this.modelPath, params, this.ModelInstance);
  }

  getAsync(params) {
    return this.modelDataRetriever.getAsync(this.modelPath, params, this.ModelInstance);
  }

  create(params) {
    const createPath = this.modelPath.split('/').slice(0, -1).join('/') + '/';
    return this.modelDataRetriever.create(createPath, params, new this.ModelInstance({}, this.modelDataRetriever, this.modelPath));
  }
}

angular.module('sm.models').value('SMModel', Model);
