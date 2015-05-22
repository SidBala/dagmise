var dagmise = require('dagmise');
var assert = require('assert');
var when = require('when');
var dag = dagmise();

assert(dag instanceof dagmise.DAG);

var count = {
	a: 0,
	b: 0,
	c: 0,
	d: 0
};

dag.add('a', 'b');
dag.add('b', 'd');
dag.add('c', 'd');

var atask;
dag.task('a', atask = function (deps) {
	// console.log('a:', deps);
	count.a++;
	return 'AAA';
});

var byield = { an: 'object' };

dag.task('b', function (deps) {
	// console.log('b:', deps);
	count.b++;
	assert(deps.a === 'AAA');
	var delay = 200;
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve(byield);
		}, delay);
	});
});

dag.task('c', function (deps) {
	count.c++;
	// console.log('c:', deps);
	return when.resolve(42);
});

dag.task('d', function (deps) {
	count.d++;
	// console.log('d:', deps);
	assert(deps.b === byield);
	assert(deps.c === 42);
	var r = {};
	r[deps.b.an] = deps.c;
	return r;
});

assert.deepEqual(dag._nodes, dag._tasks);

dag.make('d')
	.then(function (result) {
		assert.deepEqual(result, {object: 42});
		assert(count.a === 1);
		assert(count.b === 1);
		assert(count.c === 1);
		assert(count.d === 1);
	}).then(function (result) {
		// this second make does nothing, cause all things are built already.
		assert(when.isPromiseLike(dag.node('a')));
		assert(when.isPromiseLike(dag.node('d')));

		return dag.make('d').then(function (result) {
			assert.deepEqual(result, {object: 42});
			assert(count.a === 1);
			assert(count.b === 1);
			assert(count.c === 1);
			assert(count.d === 1);

			assert(when.isPromiseLike(dag.node('a')));
			assert(when.isPromiseLike(dag.node('d')));

			// revert all tasks as unrun;
			dag.reset();

			assert(dag.node('a') === atask);
			assert(typeof dag.node('d') === 'function');
			
		});
	}).then(function () {

		dag.add('a', 'c');
		
		return dag.make('d').then(function (result) {
			assert.deepEqual(result, {object: 42});
			assert(count.a === 2);
			assert(count.b === 2);
			assert(count.c === 2);
			assert(count.d === 2);

			// revert b task as unrun;
			dag.update('b');
		});
	}).then(function () {
		return dag.make('d').then(function (result) {
			assert.deepEqual(result, {object: 42});
			assert(count.a === 2);
			assert(count.b === 3);
			assert(count.c === 2);
			assert(count.d === 3);
		});
	});