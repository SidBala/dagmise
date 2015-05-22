var when = require('when');
var util = require('util');
var dager = require('dager');

// function mapValsBasedOn (obj, f) {
// 	var r = {};
// 	Object.keys(obj).forEach(function (k) {
// 		r[k] = f(k);
// 	});
// 	return r;
// }


function DAG () {
	dager.DAG.call(this);
	this._tasks = {};
}

util.inherits(DAG, dager.DAG);


DAG.prototype.task = function (node, task) {
	this._tasks[node] = task;
	this.node(node, task);
}

DAG.prototype.run = function (target) {
	// The problem with this is that it probably calls some nodes' tasks more than once.
	// For example in graphs like: A -> B -> C; A -> C; it will run C twice.
	// return when.all(Object.keys(this.to(target)).map(make))
	// 	.then(this.node(target), console.error);
	
	this.make(target).then(this.reset);
};

DAG.prototype.make = function (target) {

	var promiser = this.node(target);
	var promise = promiser;

	if (!when.isPromiseLike(promiser)) {
		var depnodes = Object.keys(this.to(target));
		promise = when.all(depnodes.map(this.make.bind(this)))
			.then(function (depvals) {
				var deps = {};
				for (var i = 0; i < depnodes.length; i++)
					deps[depnodes[i]] = depvals[i];
				return promiser(deps);
			}, console.error);
	}
	
	this.node(target, promise);
	return promise;
};

DAG.prototype.update = function (source) {
	this.node(source, this._tasks[source]);
	return when.all(Object.keys(this.from(source)).map(this.update.bind(this)));
};

DAG.prototype.reset = function () {
	for (var t in this._tasks)
		this.node(t, this._tasks[t]);
};


module.exports = function () { return new DAG(); };
module.exports.DAG = DAG;