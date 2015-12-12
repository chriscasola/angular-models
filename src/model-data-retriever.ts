/// <reference path="./module.ts"/>
/// <reference path="./model-instance.ts"/>
/// <reference path="./model.ts"/>
/// <reference path="./model-list-item-instance.ts"/>

module AngularSmarterModels {
  export class ModelDataRetrieverError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ModelDataRetrieverError';
    }
  }

  function buildUrl(path, params) {
    return path.split('/').map(function(pathComponent) {
      if (pathComponent[0] === ':') {
        const subValue = params[pathComponent.slice(1)];
        if (subValue !== null && subValue !== undefined) {
          return subValue;
        }
        throw new ModelDataRetrieverError(`Missing required param "${pathComponent.slice(1)}" for path "${path}"!`);
      }
      return pathComponent;
    }).join('/');
  }

  export class ModelDataRetriever {
    static $inject: string[] = ['$q', '$http'];

    // TODO: use a weak map for this cache? then we'd cache as long as something in the app/scope
    // was using the model, but then let it be cleared once garbage collection runs
    private modelCache: Object;
    private outstandingRequests: Object;
    private listCache: Object;

    constructor(private $q: ng.IQService, private $http: ng.IHttpService) {
      this.modelCache = {};
      this.outstandingRequests = {};
      this.listCache = {};
    }

    private cacheModel(modelUrl: string, listUrl: string, ModelInstance, modelData, identifyingField:string): ModelInstance {
      const self = this;
      const modelInstance = new ModelInstance({
        rawModel: modelData,
        modelDataRetriever: self,
        modelPath: modelUrl,
        listPath: listUrl,
        idField: identifyingField,
      });
      this.modelCache[modelUrl] = modelInstance;
      this.addModelToList(listUrl, modelInstance, 0);
      return modelInstance;
    }

    private cacheList(modelUrl: string, modelData): ModelWrapper[] {
      this.listCache[modelUrl] = modelData;
      return modelData;
    }

    private addModelToList(modelUrl: string, model:ModelWrapper, position:number = 0) {
      if (this.listCache.hasOwnProperty(modelUrl)) {
        const modelList = this.listCache[modelUrl];
        for (let i = 0; i < modelList.length; i++) {
          if (modelList[i].props[model.config.idField] === model.props[model.config.idField]) {
            modelList[i] = model;
            return;
          }
        }
        this.listCache[modelUrl].splice(position, 0, model);
      }
    }

    private removeModelFromList(modelUrl: string, modelId: string, identifyingField: string) {
      const modelList = this.listCache[modelUrl];
      for (let i = 0; i < modelList.length; i++) {
        if (modelList[i].props[identifyingField] === modelId) {
          modelList.splice(i, 1);
          break;
        }
      }
    }

    get(modelPath:string, listPath:string, params, ModelInstance, identifyingField:string):ModelInstance {
      const modelUrl = buildUrl(modelPath, params);
      if (this.modelCache.hasOwnProperty(modelUrl)) {
        return this.modelCache[modelUrl];
      }
      this.getAsync(modelPath, listPath, params, ModelInstance, identifyingField);
    }

    getAsync(modelPath:string, listPath:string, params, ModelInstance, identifyingField:string):ng.IPromise<ModelInstance> {
      const modelUrl = buildUrl(modelPath, params);
      let modelPromise;
      if (this.modelCache.hasOwnProperty(modelUrl)) {
        modelPromise = this.$q.when(this.modelCache[modelUrl]);
      } else if (this.outstandingRequests.hasOwnProperty(modelUrl)) {
        modelPromise = this.outstandingRequests[modelUrl];
      } else {
        modelPromise = this.$http.get(modelUrl)
        .then(response => {
          return this.cacheModel(modelUrl, listPath, ModelInstance, response.data, identifyingField);
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }

    getMultiple(modelPath:string, listPath:string, params, ModelInstance, identifyingField:string):ng.IPromise<Array<ModelInstance>> {
      const modelUrl = buildUrl(modelPath, params);
      let modelPromise;
      if (this.outstandingRequests.hasOwnProperty(modelUrl)) {
        modelPromise = this.outstandingRequests[modelUrl];
      } else {
        modelPromise = this.$http.get<Array<ModelInstance>>(modelUrl).then(response => {
          if (!angular.isArray(response.data)) {
            return this.$q.reject(new ModelDataRetrieverError(`Expected array of models for getMultiple request for path "${modelUrl}"!`));
          }
          return response.data.map(modelData => {
            return this.cacheModel(modelUrl + '/' + modelData[identifyingField], listPath, ModelInstance, modelData, identifyingField);
          });
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }

    list(listPath:string, modelPath: string, params, identifyingField:string): ModelWrapper[] {
      const modelUrl = buildUrl(listPath, params);
      if (this.listCache.hasOwnProperty(modelUrl)) {
        return this.listCache[modelUrl];
      }
      this.listAsync(listPath, modelPath, params, identifyingField);
    }

    listAsync(listPath:string, modelPath:string, params, identifyingField:string):ng.IPromise<ModelWrapper[]> {
      const modelUrl = buildUrl(listPath, params);
      let modelPromise;
      if (this.listCache.hasOwnProperty(modelUrl)) {
        modelPromise = this.$q.when(this.listCache[modelUrl]);
      } else if (this.outstandingRequests.hasOwnProperty(modelUrl)) {
        modelPromise = this.outstandingRequests[modelUrl];
      } else {
        modelPromise = this.$http.get<ModelWrapper[]>(modelUrl).then(response => {
          if (!angular.isArray(response.data)) {
            return this.$q.reject(new ModelDataRetrieverError(`Expected array of models for list request for path "${modelUrl}"!`));
          }
          const modelList = response.data.map(listItem => {
            const actualModelParams = {
              [identifyingField]: listItem[identifyingField]
            }
            angular.extend(actualModelParams, params);
            const actualModelUrl = buildUrl(modelPath, actualModelParams);
            if (this.modelCache.hasOwnProperty(actualModelUrl)) {
              return this.modelCache[actualModelUrl];
            } else {
              return new ModelListItemInstance({
                rawModel: listItem,
                config: {
                  idField: identifyingField,
                },
              });
            }
          });
          return this.cacheList(modelUrl, modelList);
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }

    save(model:ModelInstance):ng.IPromise<void> {
      return this.$http.post<void>(model.getModelPath(), model.serialize()).then(response => {
          // do nothing, do this to return a standard angular promise instead of an $http one
      });
    }

    create(modelPath:string, listPath:string, params, model:ModelInstance):ng.IPromise<ModelInstance> {
      const modelUrl = buildUrl(modelPath, params);
      return this.$http.put(modelUrl, model.serialize()).then(response => {
        model.merge(response.data);
        this.modelCache[response.headers('Location')] = model;
        this.addModelToList(listPath, model);
        return model;
      });
    }

    delete(modelPath:string, listPath:string, identifyingField:string):ng.IPromise<void> {
      let modelId;
      if (this.modelCache.hasOwnProperty(modelPath)) {
        modelId = this.modelCache[modelPath].props[identifyingField];
      }
      delete this.modelCache[modelPath];
      return this.$http.delete(modelPath).then(response => {
        if (modelId != null) {
          this.removeModelFromList(listPath, modelId, identifyingField);
        }
      });
    }
  }

  smModule
    .value('smModelDataRetrieverError', ModelDataRetrieverError)
    .service('smModelDataRetriever', ModelDataRetriever);
}
