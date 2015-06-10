var when = require('when');
var util = require('util');
var dager = require('dager');

function DAG () {
	dager.DAG.call(this);
	this._tasks = {};
	this._making = {};
}

util.inherits(DAG, dager.DAG);


DAG.prototype.task = function (node, deps, task) {

	var dag = this;

	if (arguments.length < 3) {
		task = deps;
		deps = [];
	}

	if (typeof deps === 'string') deps = [deps];

	deps.forEach(function (dep) {
		dag.edge(dep, node, dag.get(dep, node));
	});

	this.node(node, this._tasks[node] = function (res) {
		var args = [node].concat(deps.map(function (d) { return res[d] }));
		return task.apply(null, args);
	});

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
	if (!dag.get(target))
		return when.reject(new Error('Cannot make missing target '+ target));

	dag._making[target] = target;
	return dag._make(target)
		.then(function (result) {
			delete dag._making[target];
			return result;
		});
}

DAG.prototype._make = function (target) {

	var promiser = this.get(target);
	var promise = promiser;

	if (!when.isPromiseLike(promiser)) {
		var depnodes = Object.keys(this.to(target));
		promise = when.all(depnodes.map(this.make.bind(this)))
			.then(function (depvals) {
				var deps = {};
				for (var i = 0; i < depnodes.length; i++)
					deps[depnodes[i]] = depvals[i];
				return promiser(deps);
			});
	}
	
	this.node(target, promise);
	return promise;
};

DAG.prototype.update = function (source) {
	var dag = this;

	if (Object.keys(dag._making).length) return false;

	dag.node(source, dag._tasks[source]);
	Object.keys(dag.from(source)).forEach(function (node) {
		dag.update(node);
	});

	return true;
};

DAG.prototype.reset = function (res) {
	if (Object.keys(this._making).length) return false;

	for (var t in this._tasks)
		this.node(t, this._tasks[t]);
	return true;
};


module.exports = function () { return new DAG(); };
module.exports.DAG = DAG;