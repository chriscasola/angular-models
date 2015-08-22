class ModelInstance {
  constructor(rawModel) {
    this.rawModel = rawModel;
  }

  get props() {
    return this.rawModel;
  }
}

angular.module('sm.models').value('SMModelInstance', ModelInstance);
