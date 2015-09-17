class ModelInstance {
  constructor(config) {
    this.config = config;
  }

  get props() {
    return this.config.rawModel;
  }

  serialize() {
    return JSON.stringify(this.config.rawModel);
  }

  merge(src) {
    angular.extend(this.config.rawModel, src);
  }

  setModelPath(path) {
    this.config.modelPath = path;
  }

  getModelPath() {
    return this.config.modelPath;
  }

  save() {
    return this.config.modelDataRetriever.save(this);
  }
}

angular.module('sm.models').value('SMModelInstance', ModelInstance);
