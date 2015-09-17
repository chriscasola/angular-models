describe('Service: ModelDataRetriever', function() {
  beforeEach(module('sm.models'));

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
      this.modelDataRetriever[method]('/test_model/:id', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
    });

    it('should return undefined when get is called and the model has not been requested yet', function() {
      expect(this.modelDataRetriever.get('/test_model/:id', {id: 'tm5'}, this.MockModelInstance)).toBeUndefined();
      this.$httpBackend.flush();
    });

    it('should return undefined when get is called and the model request is outstanding', function() {
      this.modelDataRetriever.get('/test_model/:id', {id: 'tm5'}, this.MockModelInstance);
      expect(this.modelDataRetriever.get('/test_model/:id', {id: 'tm5'}, this.MockModelInstance)).toBeUndefined();
      this.$httpBackend.flush();
    });

    it('should return the model when get is called and the model request has succeeded', function() {
      this.modelDataRetriever.get('/test_model/:id', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      expect(this.modelDataRetriever.get('/test_model/:id', {id: 'tm5'}, this.MockModelInstance).props).toEqual(this.modelData);
    });

    it('should return a promise that gives the model instance when getAsync is called and the model has not been requested yet', function(done) {
      this.modelDataRetriever.getAsync('/test_model/:id', {id: 'tm5'}, this.MockModelInstance)
      .then(modelInstance => {
        expect(modelInstance instanceof this.MockModelInstance).toBe(true);
        expect(modelInstance.props).toEqual(this.modelData);
        expect(modelInstance.getModelPath()).toEqual('/test_model/tm5');
        expect(modelInstance.config.modelDataRetriever).toBe(this.modelDataRetriever);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that gives the model instance when getAsync is called and the model has already been requested', function(done) {
      this.modelDataRetriever.getAsync('/test_model/:id', {id: 'tm5'}, this.MockModelInstance);
      this.modelDataRetriever.getAsync('/test_model/:id', {id: 'tm5'}, this.MockModelInstance)
      .then(modelInstance => {
        expect(modelInstance instanceof this.MockModelInstance).toBe(true);
        expect(modelInstance.props).toEqual(this.modelData);
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that gives the model instance when getAsync is called and the model has been fetched', function(done) {
      this.modelDataRetriever.getAsync('/test_model/:id', {id: 'tm5'}, this.MockModelInstance);
      this.$httpBackend.flush();
      this.modelDataRetriever.getAsync('/test_model/:id', {id: 'tm5'}, this.MockModelInstance)
      .then(modelInstance => {
        expect(modelInstance instanceof this.MockModelInstance).toBe(true);
        expect(modelInstance.props).toEqual(this.modelData);
        setTimeout(done);
      });
      this.$rootScope.$digest();
    });

    it('should return a promise that rejects when getAsync is called and the request fails', function(done) {
      this.mockRequest.respond(500);
      this.modelDataRetriever.getAsync('/test_model/:id', {id: 'tm5'}, this.MockModelInstance)
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

      this.modelDataRetriever.create('/test_model/', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }));
      this.$httpBackend.flush();
    });

    it('should merge the properties returned from the backend when a model is created', function(done) {
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}')
      .respond(201, angular.toJson(this.modelData), {'Content-Type': 'application/json', Location: '/test_model/tm5'});

      this.modelDataRetriever.create('/test_model/', {}, new this.MockModelInstance({
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

      this.modelDataRetriever.create('/test_model/', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }));
      this.$httpBackend.flush();
      const modelInstance = this.modelDataRetriever.get('/test_model/:id', {id: 'tm5'}, this.MockModelInstance);
      expect(modelInstance.props).toEqual(angular.extend({c: 3}, this.modelData));
    });

    it('should return a promise that rejects when a create request fails', function(done) {
      this.$httpBackend.expectPUT('/test_model/', '{"c":3}').respond(500);
      this.modelDataRetriever.create('/test_model/', {}, new this.MockModelInstance({
        rawModel: {c: 3},
      }))
      .catch(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should make a delete request for the model when delete is called', function(done) {
      this.$httpBackend.expectDELETE('/test_model/tm5').respond(204);
      this.modelDataRetriever.delete('/test_model/:id', {id: 'tm5'})
      .then(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should return a promise that rejects when a delete request fails', function(done) {
      this.$httpBackend.expectDELETE('/test_model/tm5').respond(500);
      this.modelDataRetriever.delete('/test_model/:id', {id: 'tm5'})
      .catch(() => {
        setTimeout(done);
      });
      this.$httpBackend.flush();
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

    it('should return a promise that gives an array of model instances when getMultiple is called', function(done) {
      this.trainGoodResponse();
      this.modelDataRetriever.getMultiple('/test_model/', {}, this.MockModelInstance, 'id').then((models) => {
        [0, 1].forEach(i => {
          expect(models[i].props).toEqual(this.modelData[i]);
          expect(models[i] instanceof this.MockModelInstance).toBe(true);
        });
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });

    it('should only have one outgoing request at a time per model url for each getMultiple call', function() {
      this.trainGoodResponse();
      this.modelDataRetriever.getMultiple('/test_model/', {}, this.MockModelInstance, 'id');
      this.modelDataRetriever.getMultiple('/test_model/', {}, this.MockModelInstance, 'id');
      this.$httpBackend.flush();
    });

    it('should return a promise that rejects when the backend request is not an array and getMultiple is called', function(done) {
      this.trainBadDataResponse();
      this.modelDataRetriever.getMultiple('/test_model/', {}, this.MockModelInstance, 'id').catch(function() {
        setTimeout(done);
      });
      this.$httpBackend.flush();
    });
  });
});
