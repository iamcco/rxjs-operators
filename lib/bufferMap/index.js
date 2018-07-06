'use strict';

var Observable = require('rxjs/Observable').Observable;

Observable.prototype.bufferMap = function (factory) {
  var preObservable = this;
  var values = [];
  var isComplete = false;
  var isPending = false;
  var next = function next(observer) {
    return function (arg) {
      if (arg !== undefined) {
        values.push(arg);
      }
      if (!isPending) {
        isPending = true;
        var params = values;
        values = [];
        try {
          return factory(params).subscribe({
            next: function next(res) {
              return observer.next(res);
            },
            error: function error(err) {
              return observer.error(err);
            },
            complete: function complete() {
              isPending = false;
              if (values.length) {
                next(observer)();
              } else if (isComplete) {
                observer.complete();
              }
            }
          });
        } catch (err) {
          return observer.error(err);
        }
      }
    };
  };
  return new Observable(function (observer) {
    return preObservable.subscribe({
      next: next(observer),
      error: function error(err) {
        isComplete = true;
        return observer.error(err);
      },
      complete: function complete() {
        isComplete = true;
      }
    });
  });
};