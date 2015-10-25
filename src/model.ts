/// <reference path="./module.ts"/>
/// <reference path="./model-instance.ts"/>

module AngularSmarterModels {
  export class Model {
    constructor(private config) {

    }

    get(params):ModelInstance {
      return this.config.modelDataRetriever.get(this.config.modelPath, params, this.config.ModelInstance);
    }

    getAsync(params):ng.IPromise<ModelInstance> {
      return this.config.modelDataRetriever.getAsync(this.config.modelPath, params, this.config.ModelInstance);
    }

    create(params):ng.IPromise<ModelInstance> {
      const createPath = this.config.modelPath.split('/').slice(0, -1).join('/') + '/';
      return this.config.modelDataRetriever.create(createPath, params, new this.config.ModelInstance({
        rawModel: {},
        modelDataRetriever: this.config.modelDataRetriever,
        modelPath: this.config.modelPath,
      }));
    }
  }

  smModule.value('SMModel', Model);
}
