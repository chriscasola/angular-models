/// <reference path="./module.ts"/>
/// <reference path="./model-instance.ts"/>
/// <reference path="./model.ts"/>
/// <reference path="./model-list-item-instance.ts"/>
/// <reference path="./model-error.ts"/>

module AngularSmarterModels {
  export class ModelDataRetrieverError extends Error {
    constructor(public message:string) {
      super(message);
      this.name = 'ModelDataRetrieverError';
    }
  }

  class UrlCache {
    private cache: Object = {};

    has(key:string):boolean {
      return this.cache.hasOwnProperty(this.stripTrailingSlash(key));
    }

    get(key:string) {
      return this.cache[this.stripTrailingSlash(key)];
    }

    set(key:string, value:any) {
      this.cache[this.stripTrailingSlash(key)] = value;
    }

    private stripTrailingSlash(key:string):string {
      if (key.slice(-1) === '/') {
        return key.slice(0, -1);
      } else {
        return key;
      }
    }
  }

  var retryInterval = 10000;

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
    private listCache: UrlCache;

    constructor(private $q: ng.IQService, private $http: ng.IHttpService) {
      this.modelCache = {};
      this.outstandingRequests = {};
      this.listCache = new UrlCache();
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

    private cacheError(modelUrl: string, listUrl: string, identifyingField: string): ModelError {
      const errorInstance = new ModelError({
        error: 'An error occurred fetching the model!',
        time: Date.now(),
      });
      this.modelCache[modelUrl] = errorInstance;
      return errorInstance;
    }

    private cacheList(modelUrl: string, modelData): ModelWrapper[] {
      this.listCache.set(modelUrl, modelData);
      return modelData;
    }

    private hasListCache(modelUrl: string): boolean {
      const cacheItem = this.listCache.get(modelUrl);
      return this.listCache.has(modelUrl) && cacheItem !== null;
    }

    private shouldRetryFetch(modelError: ModelError) {
      return Date.now() - modelError.time > retryInterval;
    }

    private addModelToList(modelUrl: string, model:ModelWrapper, position:number = 0) {
      if (this.hasListCache(modelUrl)) {
        const modelList = this.listCache.get(modelUrl);
        for (let i = 0; i < modelList.length; i++) {
          if (modelList[i].props[model.config.idField] === model.props[model.config.idField]) {
            modelList[i] = model;
            return;
          }
        }
        this.listCache.get(modelUrl).splice(position, 0, model);
      }
    }

    private removeModelFromList(modelUrl: string, modelId: string, identifyingField: string) {
      const modelList = this.listCache.get(modelUrl);
      for (let i = 0; i < modelList.length; i++) {
        if (modelList[i].props[identifyingField] === modelId) {
          modelList.splice(i, 1);
          break;
        }
      }
    }

    get(modelPath:string, listPath:string, params, ModelInstance, identifyingField:string):ModelInstance {
      const modelUrl = buildUrl(modelPath, params);
      const cachedValue = this.modelCache[modelUrl];
      const valueInCache = this.modelCache.hasOwnProperty(modelUrl);

      if ( !valueInCache || (cachedValue instanceof ModelError && this.shouldRetryFetch(cachedValue))) {
        this.getAsync(modelPath, listPath, params, ModelInstance, identifyingField);
      }

      if (valueInCache) {
        return cachedValue;
      }
    }

    getAsync(modelPath:string, listPath:string, params, ModelInstance, identifyingField:string):ng.IPromise<ModelInstance> {
      const modelUrl = buildUrl(modelPath, params);
      let modelPromise;
      const cachedValue = this.modelCache[modelUrl];

      if (this.modelCache.hasOwnProperty(modelUrl) && !(cachedValue instanceof ModelError)) {
        modelPromise = this.$q.when(cachedValue);
      } else if (this.outstandingRequests.hasOwnProperty(modelUrl)) {
        modelPromise = this.outstandingRequests[modelUrl];
      } else {
        modelPromise = this.$http.get(modelUrl)
        .then(response => {
          return this.cacheModel(modelUrl, listPath, ModelInstance, response.data, identifyingField);
        })
        .catch(response => {
          return this.$q.reject(this.cacheError(modelUrl, listPath, identifyingField));
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }

    getMultipleAsync(collectionPath:string, modelPath:string, params, ModelInstance, identifyingField:string):ng.IPromise<ModelInstance[]> {
      return this.getMultipleHelper<ModelInstance>(collectionPath, modelPath, params, ModelInstance, identifyingField, false);
    }

    list(listPath:string, modelPath: string, params, identifyingField:string): ModelWrapper[] {
      const modelUrl = buildUrl(listPath, params);
      if (this.hasListCache(modelUrl)) {
        return this.listCache.get(modelUrl);
      }

      if (this.listCache.get(modelUrl) !== null) {
        this.listAsync(listPath, modelPath, params, identifyingField);
      }
    }

    listAsync(listPath:string, modelPath:string, params, identifyingField:string):ng.IPromise<ModelWrapper[]> {
      return this.getMultipleHelper<ModelWrapper>(listPath, modelPath, params, null, identifyingField, true);
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
        model.setModelPath(response.headers('Location'));
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

    private getMultipleHelper<T>(collectionPath: string, modelPath: string, params, ModelInstance, identifyingField: string, isList: boolean): ng.IPromise<T[]> {
      const modelUrl = buildUrl(collectionPath, params);
      let modelPromise;
      if (this.hasListCache(modelUrl)) {
        modelPromise = this.$q.when(this.listCache.get(modelUrl));
      } else if (this.outstandingRequests.hasOwnProperty(modelUrl)) {
        modelPromise = this.outstandingRequests[modelUrl];
      } else {
        modelPromise = this.$http.get<T[]>(modelUrl).then(response => {
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
            } else if (!isList) {
              return this.cacheModel(actualModelUrl, collectionPath, ModelInstance, listItem, identifyingField);
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
        .catch(response => {
          this.listCache.set(modelUrl, null);
          return this.$q.reject(response);
        })
        .finally(() => {
          delete this.outstandingRequests[modelUrl];
        });
        this.outstandingRequests[modelUrl] = modelPromise;
      }
      return modelPromise;
    }
  }

  interface ISMModelDataRetrieverProvider extends ng.IServiceProvider {
    setRetryInterval(number)
  }

  var serviceProvider:ISMModelDataRetrieverProvider = {
    setRetryInterval: function(interval) {
      retryInterval = interval;
    },

    $get: ['$injector', function($injector) {
      return $injector.instantiate(ModelDataRetriever);
    }]
  };

  smModule
    .value('smModelDataRetrieverError', ModelDataRetrieverError)
    .provider('smModelDataRetriever', serviceProvider);
}
