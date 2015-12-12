/// <reference path="../typings/tsd.d.ts"/>
/// <reference path="./module.ts"/>
/// <reference path="./model-wrapper.ts"/>

module AngularSmarterModels {
  export interface ModelErrorConfig {
    error: string,
    time: number,
  }

  export class ModelError implements ModelWrapper {
    constructor(public config:ModelErrorConfig) {

    }

    get props() {
      return undefined;
    }

    get error():string {
      return this.config.error;
    }

    get time():number {
      return this.config.time;
    }
  }
}
