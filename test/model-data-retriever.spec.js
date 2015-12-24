describe('Service: ModelDataRetriever', function() {
  beforeEach(module('sm.models', function(smModelDataRetrieverProvider) {
    smModelDataRetrieverProvider.setRetryInterval(100);
  }));

  beforeEach(inject(function($httpBackend, $rootScope) {
    this.$httpBackend = $httpBackend;
    this.$rootScope = $rootScope;
  }));

  beforeEach(inject(function(smModelDataRetriever) {
    this.modelDataRetriever = smModelDataRetriever;
    this.MockModelInstance = function(config) {
      this.props = config.rawModel;
      this.config = config;
      this.serialize = function() {
        return angular.toJson(this.props);
      };
      this.merge = function(src) {
        angular.extend(this.props, src);
      };
      this.getModelPath = function() {
        return this.config.modelPath;
      };
      this.setModelPath = function(path) {
        this.config.modelPath = path;
      };
    };
  }));

  afterEach(function() {
    this.$httpBackend.verifyNoOutstandingExpectation();
    this.$httpBackend.verifyNoOutstandingRequest();
  });

  describe('element methods', function() {
    beforeEach(function() {
      this.modelData = {
        id: 'tm5',
        a: 1,
        b: 2,
      };
      this.mockRequest = this.$httpBackend.whenGET('/test_model/tm5').respond(200, angular.toJson(this.modelData), {'Content-Type': 'application/json'});
    });

    they('should make a request for the model when $prop is called if the model is not cached and no request is outstanding',
      ['get', 'getAsync'], function(method) {
      this.$httpBackend.expectGET('/test_model/tm5');
      this.modelDataRetriever[method]('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
    });

    it('should return undefined when get is called and the model has not been requested yet', function() {
      expect(this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)).toBeUndefined();
      this.$httpBackend.flush();
    });

    it('should return undefined when get is called and the model request is outstanding', function() {
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      expect(this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)).toBeUndefined();
      this.$httpBackend.flush();
    });

    it('should return the model when get is called and the model request has succeeded', function() {
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      expect(this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance).props).toEqual(this.modelData);
    });

    it('should return a promise that gives the model instance when getAsync is called and the model has not been requested yet', function(done) {
      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)
      .then(modelInstance => {
        expect(modelInstance instanceof this.MockModelInstance).toBe(true);
        expect(modelInstance.props).toEqual(this.modelData);
        expect(modelInstance.getModelPath()).toEqual('/test_model/tm5');
        expect(modelInstance.config.modelDataRetriever).toBe(this.modelDataRetriever);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should add the given model to the list when getAsync is called', function(done) {
      this.$httpBackend.whenGET('/test_model/?list=true')
        .respond(200, angular.toJson([]), {'Content-Type': 'application/json'});
      this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      this.$httpBackend.flush();

      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)
      .then(() => {
        const modelList = this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
        expect(modelList.length).toBe(1);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that gives the model instance when getAsync is called and the model has already been requested', function(done) {
      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)
      .then(modelInstance => {
        expect(modelInstance instanceof this.MockModelInstance).toBe(true);
        expect(modelInstance.props).toEqual(this.modelData);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that gives the model instance when getAsync is called and the model has been fetched', function(done) {
      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)
      .then(modelInstance => {
        expect(modelInstance instanceof this.MockModelInstance).toBe(true);
        expect(modelInstance.props).toEqual(this.modelData);
        setTimeout(done);
      });
      this.$rootScope.$digest();
    });

    it('should return a promise that rejects when getAsync is called and the request fails', function(done) {
      this.mockRequest.respond(500);
      this.modelDataRetriever.getAsync('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)
      .catch(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should make a save request for the model when save is called', function(done) {
      this.$httpBackend.expectPOST('/test_model/tm5', angular.toJson(this.modelData)).respond(204);
      this.modelDataRetriever.save(new this.MockModelInstance({
        rawModel: this.modelData,
        modelPath: '/test_model/tm5',
      }))
      .then(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that rejects when a save request fails', function(done) {
      this.$httpBackend.expectPOST('/test_model/tm5').respond(500);
      this.modelDataRetriever.save(new this.MockModelInstance({
        rawModel: this.modelData,
        modelPath: '/test_model/tm5',
      }))
      .catch(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should make a create request for the model when create is called', function() {
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}')
      .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});

      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }));
      this.$httpBackend.flush();
    });

    it('should merge the properties returned from the backend when a model is created', function(done) {
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}')
      .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});

      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }))
      .then((modelInstance) => {
        expect(modelInstance.props).toEqual(angular.extend({c: 3}, this.modelData));
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should cache a model instance after it has been created', function() {
      this.mockRequest.respond(500); // make sure a get request isn't made
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}')
      .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});

      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }));
      this.$httpBackend.flush();
      const modelInstance = this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      expect(modelInstance.props).toEqual(angular.extend({c: 3}, this.modelData));
    });

    it('should set the modelPath of a model instance after the backend returns the new model', function(done) {
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}')
      .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});
      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      })).then(modelInstance => {
        expect(modelInstance.getModelPath()).toBe('/test_model/tm5');
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that rejects when a create request fails', function(done) {
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}').respond(500);
      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }))
      .catch(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should add a model to the list when it is created', function() {
      this.$httpBackend.whenGET('/test_model/?list=true')
        .respond(200, angular.toJson([]), {'Content-Type': 'application/json'});
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model/:id', {}, 'id');
      this.$httpBackend.flush();

      this.$httpBackend.whenPUT('/test_model/', '{"c":3,"id":1}')
        .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});

      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3, id: 1},
      }));
      this.$httpBackend.flush();

      const list = this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      expect(list.length).toBe(1);
    });

    it('should make a delete request for the model when delete is called', function(done) {
      this.$httpBackend.expectDELETE('/test_model/tm5').respond(204);
      this.modelDataRetriever.delete('/test_model/tm5', '/test_model/?list=true', 'id')
      .then(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that rejects when a delete request fails', function(done) {
      this.$httpBackend.expectDELETE('/test_model/tm5').respond(500);
      this.modelDataRetriever.delete('/test_model/tm5', '/test_model/?list=true', 'id')
      .catch(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should remove a model from the cache when it is deleted', function() {
      this.$httpBackend.expectDELETE('/test_model/tm5').respond(500);
      this.modelDataRetriever.delete('/test_model/tm5', '/test_model/?list=true', 'id');
      expect(this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance)).toBeUndefined();
      this.$httpBackend.flush();
    });

    it('should remove a model from the list when it is deleted', function() {
      this.$httpBackend.whenGET('/test_model/?list=true')
        .respond(200, angular.toJson([]), {'Content-Type': 'application/json'});
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model/:id', {}, 'id');
      this.$httpBackend.flush();

      this.$httpBackend.whenPUT('/test_model/', '{"c":3,"id":"tm5"}')
        .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});

      this.modelDataRetriever.create('/test_model/', '/test_model/?list=true', {}, new this.MockModelInstance({
        rawModel: {c: 3, id: 'tm5'},
      }));
      this.$httpBackend.flush();

      let list = this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      expect(list.length).toBe(1);

      this.$httpBackend.expectDELETE('/test_model/tm5').respond(204);
      this.modelDataRetriever.delete('/test_model/tm5', '/test_model/?list=true', 'id');
      this.$httpBackend.flush();

      list = this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      expect(list.length).toBe(0);
    });
  });

  describe('collection methods', function() {
    beforeEach(function() {
      this.modelData = [
        {
          id: 'tm5',
          a: 1,
          b: 2,
        },
        {
          id: 'tm6',
          a: 3,
          b: 4,
        },
      ];

      this.trainGoodResponse = function() {
        this.mockRequest = this.$httpBackend.expectGET('/test_model/')
        .respond(200, angular.toJson(this.modelData), {'Content-Type': 'application/json'});
      };

      this.trainBadDataResponse = function() {
        this.mockRequest = this.$httpBackend.expectGET('/test_model/')
        .respond(200, angular.toJson({}), {'Content-Type': 'application/json'});
      };
    });

    it('should return a promise that gives an array of model instances when getMultipleAsync is called', function(done) {
      this.trainGoodResponse();
      this.modelDataRetriever.getMultipleAsync('/test_model/', '/test_model/:id', {}, this.MockModelInstance, 'id').then((models) => {
        [0, 1].forEach(i => {
          expect(models[i].props).toEqual(this.modelData[i]);
          expect(models[i] instanceof this.MockModelInstance).toBe(true);
        });
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should only have one outgoing request at a time per model url for each getMultipleAsync call', function() {
      this.trainGoodResponse();
      this.modelDataRetriever.getMultipleAsync('/test_model/', '/test_model/:id', {}, this.MockModelInstance, 'id');
      this.modelDataRetriever.getMultipleAsync('/test_model/', '/test_model/:id', {}, this.MockModelInstance, 'id');
      this.$httpBackend.flush();
    });

    it('should return a promise that rejects when the backend request is not an array and getMultipleAsync is called', function(done) {
      this.trainBadDataResponse();
      this.modelDataRetriever.getMultipleAsync('/test_model/', '/test_model/:id', {}, this.MockModelInstance, 'id').catch(function() {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });
  });

  describe('list methods', function() {
    beforeEach(function() {
      this.modelData = [
        {
          id: 'tm5',
        },
        {
          id: 'tm6',
        },
      ];

      this.trainGoodResponse = function() {
        this.mockRequest = this.$httpBackend.expectGET('/test_model/?list=true')
        .respond(200, angular.toJson(this.modelData), {'Content-Type': 'application/json'});
      };

      this.trainBadDataResponse = function() {
        this.mockRequest = this.$httpBackend.expectGET('/test_model/?list=true')
        .respond(200, angular.toJson({}), {'Content-Type': 'application/json'});
      };

      this.fullModel = {
        id: 'tm5',
        a: 1,
        b: 2,
      };

      this.trainGoodModelResponse = function() {
        this.mockModelRequest = this.$httpBackend.whenGET('/test_model/tm5').respond(200, angular.toJson(this.fullModel), {'Content-Type': 'application/json'});
      };
    });

    it('should return a promise that resolves to an array when listAsync is called', function(done) {
      this.trainGoodResponse();
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model', {}, 'id').then(list => {
        expect(list.length).toBe(2);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that resolves to the cached list when listAsync is called a second time', function(done) {
      this.trainGoodResponse();
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model/:id', {}, 'id');
      this.$httpBackend.flush();
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model/:id', {}, 'id').then(list => {
        expect(list.length).toBe(2);
        setTimeout(done);
      });
      this.$rootScope.$apply();
    });

    it('should include actual model items if they have already been fetched', function(done) {
      this.trainGoodModelResponse();
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      this.trainGoodResponse();
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model/:id', {}, 'id').then(list => {
        expect(list.length).toBe(2);
        expect(list[0].props).toEqual(this.fullModel);
        expect(list[1].props).toEqual(this.modelData[1]);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should replace placeholder models with the actual model when get is called', function() {
      this.trainGoodResponse();
      this.modelDataRetriever.listAsync('/test_model/?list=true', '/test_model/:id', {}, 'id');
      this.$httpBackend.flush();

      let modelList = this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      expect(modelList[0].props).toEqual(this.modelData[0]);

      this.trainGoodModelResponse();
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();

      modelList = this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      expect(modelList[0].props).toEqual(this.fullModel);
    });
  });

  describe('error handling', function() {
    it('should not make another model request when get is called if a request recently failed', function() {
      this.$httpBackend.expectGET('/test_model/tm5').respond(500);
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
    });

    it('should retry the model request after a 1 second delay', function(done) {
      const self = this;
      this.$httpBackend.expectGET('/test_model/tm5').respond(500);
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      this.$httpBackend.expectGET('/test_model/tm5').respond(500);
      setTimeout(function() {
        self.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, self.MockModelInstance);
        self.$httpBackend.flush();
        setTimeout(done);
      }, 200);
    });

    it('should reset the model error time each time a request fails', function(done) {
      const self = this;
      this.$httpBackend.expectGET('/test_model/tm5').respond(500);
      this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      const modelError = this.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.expectGET('/test_model/tm5').respond(500);
      setTimeout(function() {
        self.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, self.MockModelInstance);
        self.$httpBackend.flush();
        const secondModelError = self.modelDataRetriever.get('/test_model/:id', '/test_model/?list=true', {id: 'tm5'}, self.MockModelInstance);
        expect(secondModelError.time > modelError.time);
        setTimeout(done);
      }, 200);
    });

    it('should not try the model request again when list is called if it previously failed', function() {
      this.$httpBackend.expectGET('/test_model/?list=true').respond(500);
      this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
      this.$httpBackend.flush();
      this.modelDataRetriever.list('/test_model/?list=true', '/test_model/:id', {}, 'id');
    });
  });
});
