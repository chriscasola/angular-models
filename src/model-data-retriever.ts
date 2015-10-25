/// <reference path="./module.ts"/>
/// <reference path="./model-instance.ts"/>
/// <reference path="./model.ts"/>

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
    static $inject:string[] = ['$q', '$http'];

    // TODO: use a weak map for this cache? then we'd cache as long as something in the app/scope
    // was using the model, but then let it be cleared once garbage collection runs
    private modelCache: Object;
    private outstandingRequests: Object;

    constructor(private $q:ng.IQService, private $http:ng.IHttpService) {
      this.modelCache = {};
      this.outstandingRequests = {};
    }

    cacheModel(modelUrl:string, ModelInstance, modelData):ModelInstance {
      const self = this;
      const modelInstance = new ModelInstance({
        rawModel: modelData,
        modelDataRetriever: self,
        modelPath: modelUrl,
      });
      this.modelCache[modelUrl] = modelInstance;
      return modelInstance;
    }

    get(modelPath:string, params, ModelInstance):ModelInstance {
      const modelUrl = buildUrl(modelPath, params);
      if (this.modelCache.hasOwnProperty(modelUrl)) {
        return this.modelCache[modelUrl];
      }
      this.getAsync(modelPath, params, ModelInstance);
    }

    getAsync(modelPath:string, params, ModelInstance):ng.IPromise<ModelInstance> {
      const modelUrl = buildUrl(modelPath, params);
      let modelPromise;
      if (this.modelCache.hasOwnProperty(modelUrl)) {
        modelPromise = this.$q.when(this.modelCache[modelUrl]);
      } else if (this.outstandingRequests.hasOwnProperty(modelUrl)) {
        modelPromise = this.outstandingRequests[modelUrl];
      } else {
        modelPromise = this.$http.get(modelUrl)
        .then(response => {
          return this.cacheModel(modelUrl, ModelInstance, response.data);
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }

    getMultiple(modelPath:string, params, ModelInstance, identifyingField:string):ng.IPromise<Array<ModelInstance>> {
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
            return this.cacheModel(modelUrl + '/' + modelData[identifyingField], ModelInstance, modelData);
          });
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }

    save(model:ModelInstance):ng.IHttpPromise<void> {
      return this.$http.post<void>(model.getModelPath(), model.serialize());
    }

    create(modelPath:string, params, model:ModelInstance):ng.IPromise<ModelInstance> {
      const modelUrl = buildUrl(modelPath, params);
      return this.$http.put(modelUrl, model.serialize()).then(response => {
        model.merge(response.data);
        this.modelCache[response.headers('Location')] = model;
        return model;
      });
    }

    delete(modelPath:string):ng.IHttpPromise<void> {
      delete this.modelCache[modelPath];
      return this.$http.delete<void>(modelPath);
    }
  }

  smModule
    .value('smModelDataRetrieverError', ModelDataRetrieverError)
    .service('smModelDataRetriever', ModelDataRetriever);
}
