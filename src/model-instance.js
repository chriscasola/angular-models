class ModelInstance {
  constructor(rawModel, modelDataRetriever, modelPath) {
    this.rawModel = rawModel;
    this.modelDataRetriever = modelDataRetriever;
    this.modelPath = modelPath;
  }

  get props() {
    return this.rawModel;
  }

  serialize() {
    return JSON.stringify(this.rawModel);
  }

  setModelPath(path) {
    this.modelPath = path;
  }

  getModelPath() {
    return this.modelPath;
  }

  save() {
    return this.modelDataRetriever.save(this);
  }
}

angular.module('sm.models').value('SMModelInstance', ModelInstance);
