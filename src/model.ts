/// <reference path="./module.ts"/>
/// <reference path="./model-instance.ts"/>
/// <reference path="./model-wrapper.ts"/>

module AngularSmarterModels {
  export interface ModelConfig {
    modelDataRetriever: ModelDataRetriever,
    modelPath: string,
    listPath: string,
    ModelInstance: any,
    idField: string
  }

  export class Model {
    constructor(private config:ModelConfig) {

    }

    get(params):ModelInstance {
      return this.config.modelDataRetriever.get(this.config.modelPath, this.config.listPath, params, this.config.ModelInstance, this.config.idField);
    }

    getAsync(params):ng.IPromise<ModelInstance> {
      return this.config.modelDataRetriever.getAsync(this.config.modelPath, this.config.listPath, params, this.config.ModelInstance, this.config.idField);
    }

    list(params):ModelWrapper[] {
      return this.config.modelDataRetriever.list(this.config.listPath, this.config.modelPath, params, this.config.idField);
    }

    listAsync(params):ng.IPromise<ModelWrapper[]> {
      return this.config.modelDataRetriever.listAsync(this.config.listPath, this.config.modelPath, params, this.config.idField);
    }

    getMultipleAsync(params):ng.IPromise<ModelInstance[]> {
      let collectionPath = this.config.modelPath.split('/').slice(0, -1).join('/') + '/';
      if (collectionPath.slice(-1) === '/') {
        collectionPath = collectionPath.slice(0, -1);
      }
      return this.config.modelDataRetriever.getMultipleAsync(collectionPath, this.config.modelPath, params, this.config.ModelInstance, this.config.idField);
    }

    create(params, props):ng.IPromise<ModelInstance> {
      const createPath = this.config.modelPath.split('/').slice(0, -1).join('/') + '/';
      return this.config.modelDataRetriever.create(createPath, this.config.listPath, params, new this.config.ModelInstance({
        rawModel: props,
        modelDataRetriever: this.config.modelDataRetriever,
        modelPath: this.config.modelPath,
        idField: this.config.idField,
        listPath: this.config.listPath
      }));
    }
  }

  smModule.value('SMModel', Model);
}
