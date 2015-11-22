/// <reference path="./module.ts"/>
/// <reference path="./model-instance.ts"/>
/// <reference path="./model.ts"/>
/// <reference path="./model-data-retriever.ts"/>

module AngularSmarterModels {

  export class ModelBuilder {
    constructor(private route:string, private _listPath:string, private Model, private ModelInstance, private _modelDataRetriever:ModelDataRetriever) {

    }

    model(Model):ModelBuilder {
      this.Model = Model;
      return this;
    }

    modelInstance(ModelInstance):ModelBuilder {
      this.ModelInstance = ModelInstance;
      return this;
    }

    modelDataRetriever(modelDataRetriever):ModelBuilder {
      this._modelDataRetriever = modelDataRetriever;
      return this;
    }

    listPath(listPath):ModelBuilder {
      this._listPath = listPath;
      return this;
    }

    done():Model {
      return new this.Model({
        modelPath: this.route,
        ModelInstance: this.ModelInstance,
        modelDataRetriever: this._modelDataRetriever,
        listPath: this._listPath,
      });
    }
  }

  export interface modelBuilder {
    (route: string, listPath:string): ModelBuilder;
  }

  function modelFactory(SMModel, SMModelInstance, smModelDataRetriever):modelBuilder {
    var service:modelBuilder = function(route:string, listPath:string):ModelBuilder {
      return new ModelBuilder(route, listPath, SMModel, SMModelInstance, smModelDataRetriever);
    };
    return service;
  }

  modelFactory.$inject = ['SMModel', 'SMModelInstance', 'smModelDataRetriever'];

  angular.module('sm.models').factory('smModelFactory', modelFactory);
}
