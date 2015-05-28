var when = require('when');
var util = require('util');
var dager = require('dager');

function DAG () {
	dager.DAG.call(this);
	this._tasks = {};
	this._making = {};
}

util.inherits(DAG, dager.DAG);


DAG.prototype.task = function (node, task) {
	this._tasks[node] = task;
	this.node(node, task);
}

DAG.prototype.run = function (target) {
	var dag = this;
	return this.make(target).then(function (result) {
		dag.reset();
		return result;
	});
};

DAG.prototype.make = function (target) {
	var dag = this;
	if (!dag.node(target))
		return when.reject(new Error('Cannot make missing target '+ target));

	dag._making[target] = target;
	return dag._make(target)
		.then(function (result) {
			delete dag._making[target];
			return result;
		});
}

DAG.prototype._make = function (target) {

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
	var making;
	if ((making = Object.keys(this._making)).length)
		return when.reject(new Error('Cannot update while making targets: ' + making.join(' ')));

	this.node(source, this._tasks[source]);
	return when.all(Object.keys(this.from(source)).map(this.update.bind(this)));
};

DAG.prototype.reset = function (res) {
	var making;
	if (making = Object.keys(this._making).length)
		return when.reject(new Error('Cannot update while making targets: ' + making.join(' ')));

	for (var t in this._tasks)
		this.node(t, this._tasks[t]);
	return when.resolve(res);
};


module.exports = function () { return new DAG(); };
module.exports.DAG = DAG;