class Model {
  constructor(config ) {
    this.config = config;
  }

  get(params) {
    return this.config.modelDataRetriever.get(this.config.modelPath, params, this.config.ModelInstance);
  }

  getAsync(params) {
    return this.config.modelDataRetriever.getAsync(this.config.modelPath, params, this.config.ModelInstance);
  }

  create(params) {
    const createPath = this.config.modelPath.split('/').slice(0, -1).join('/') + '/';
    return this.config.modelDataRetriever.create(createPath, params, new this.config.ModelInstance({
      rawModel: {},
      modelDataRetriever: this.config.modelDataRetriever,
      modelPath: this.config.modelPath,
    }));
  }
}

angular.module('sm.models').value('SMModel', Model);
