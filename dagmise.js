var when = require('when');
var util = require('util');
var dager = require('dager');

function DAG () {
	dager.DAG.call(this);
	this._tasks = {};
}

util.inherits(PromiseDAG, dager.DAG);


DAG.prototype.run = function (target) {
	// The problem with this is that it probably calls some nodes' tasks more than once.
	// For example in graphs like: A -> B -> C; A -> C; it will run C twice.
	// return when.all(Object.keys(this.to(target)).map(make))
	// 	.then(this.node(target), console.error);
	
	this.make(target).then(this.reset);
};

DAG.prototype.make = function (target) {
	var promiser = this.node(target);
	var promise = when.isPromiseLike(promiser) ?
		promiser :
		when.all(Object.keys(this.to(target)).map(this.make))
			.then(promiser, console.error);
	
	this.node(target, promise);
	return promise;
};

DAG.prototype.update = function (source) {
	this.node(source, this._tasks[source]);
	return when.all(Object.keys(this.from(source)).map(this.update)
};

DAG.prototype.reset = function () {
	for (var t in this._tasks)
		this.node(t, this._tasks[t]);
};


module.exports = function () { return new DAG(); };
module.exports.DAG = DAG;