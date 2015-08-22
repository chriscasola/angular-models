class ModelDataRetrieverError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelDataRetrieverError';
  }
}

function ModelDataRetriever($q, $http) {
  function buildUrl(path, params) {
    return path.split('/').map(function(pathComponent) {
      if (pathComponent[0] === ':') {
        const subValue = params[pathComponent.slice(1)];
        if (subValue) {
          return subValue;
        }
        throw new ModelDataRetrieverError(`Missing required param "${pathComponent.slice(1)}" for path "${path}"!`);
      }
      return pathComponent;
    }).join('/');
  }

  // TODO: use a weak map for this cache? then we'd cache as long as something in the app/scope
  // was using the model, but then let it be cleared once garbage collection runs
  const modelCache = new Map();
  const outstandingRequests = new Map();

  function cacheModel(modelUrl, ModelInstance, modelData ) {
    const modelInstance = new ModelInstance(modelData);
    modelCache.set(modelUrl, modelInstance);
    return modelInstance;
  }

  this.get = function(modelPath, params, ModelInstance) {
    const modelUrl = buildUrl(modelPath, params);
    if (modelCache.has(modelUrl)) {
      return modelCache.get(modelUrl);
    }
    this.getAsync(modelPath, params, ModelInstance);
  };

  this.getAsync = function(modelPath, params, ModelInstance) {
    const modelUrl = buildUrl(modelPath, params);
    let modelPromise;
    if (modelCache.has(modelUrl)) {
      modelPromise = $q.when(modelCache.get(modelUrl));
    } else if (outstandingRequests.has(modelUrl)) {
      modelPromise = outstandingRequests.get(modelUrl);
    } else {
      modelPromise = $http.get(modelUrl)
      .then(function(response) {
        return cacheModel(modelUrl, ModelInstance, response.data);
      })
      .finally(function() {
        outstandingRequests.delete(modelUrl);
      });
      outstandingRequests.set(modelUrl, modelPromise);
    }
    return modelPromise;
  };

  this.getMultiple = function(modelPath, params, ModelInstance, identifyingField) {
    const modelUrl = buildUrl(modelPath, params);
    let modelPromise;
    if (outstandingRequests.has(modelUrl)) {
      modelPromise = outstandingRequests.get(modelUrl);
    } else {
      modelPromise = $http.get(modelUrl).then(function(response) {
        if (!angular.isArray(response.data)) {
          return $q.reject(new ModelDataRetrieverError(`Expected array of models for getMultiple request for path "${modelUrl}"!`));
        }
        return response.data.map(function(modelData) {
          return cacheModel(modelUrl + '/' + modelData[identifyingField], ModelInstance, modelData);
        });
      })
      .finally(function() {
        outstandingRequests.delete(modelUrl);
      });
      outstandingRequests.set(modelUrl, modelPromise);
    }
    return modelPromise;
  };

  this.save = function(modelPath, params, model) {
    const modelUrl = buildUrl(modelPath, params);
    return $http.post(modelUrl, model.serialize());
  };

  this.create = function(modelPath, params, model) {
    const modelUrl = buildUrl(modelPath, params);
    return $http.put(modelUrl, model.serialize()).then(function(response) {
      model.merge(response.data);
      modelCache.set(response.headers('Location'), model);
      return model;
    });
  };

  this.delete = function(modelPath, params) {
    const modelUrl = buildUrl(modelPath, params);
    return $http.delete(modelUrl);
  };
}

ModelDataRetriever.$inject = ['$q', '$http'];

angular.module('sm.models')
  .value('smModelDataRetrieverError', ModelDataRetrieverError)
  .service('smModelDataRetriever', ModelDataRetriever);
