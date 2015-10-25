/// <reference path="../typings/tsd.d.ts"/>
/// <reference path="./module.ts"/>

module AngularSmarterModels {
  export class ModelInstance {
    constructor(private config) {

    }

    get props() {
      return this.config.rawModel;
    }

    serialize():string {
      return JSON.stringify(this.config.rawModel);
    }

    merge(src):void {
      angular.extend(this.config.rawModel, src);
    }

    setModelPath(path):void {
      this.config.modelPath = path;
    }

    getModelPath():string {
      return this.config.modelPath;
    }

    save():ng.IPromise<void> {
      return this.config.modelDataRetriever.save(this);
    }

    delete():ng.IPromise<void> {
      return this.config.modelDataRetriever.delete(this.config.modelPath);
    }
  }

  smModule.value('SMModelInstance', ModelInstance);
}
