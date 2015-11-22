/// <reference path="../typings/tsd.d.ts"/>
/// <reference path="./module.ts"/>
/// <reference path="./model-wrapper.ts"/>

module AngularSmarterModels {
  export class ModelListItemInstance implements ModelWrapper {
    constructor(public config) {

    }

    get props() {
      return this.config.rawModel;
    }
  }

  smModule.value('SMModelListItemInstance', ModelListItemInstance);
}
