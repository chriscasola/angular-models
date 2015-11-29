/// <reference path="../typings/tsd.d.ts"/>
/// <reference path="./module.ts"/>
/// <reference path="./model-wrapper.ts"/>

module AngularSmarterModels {
  export class ModelListItemInstance implements ModelWrapper {
    constructor(private _config) {

    }

    get config() {
      return this._config.config;
    }

    get props() {
      return this._config.rawModel;
    }
  }

  smModule.value('SMModelListItemInstance', ModelListItemInstance);
}
