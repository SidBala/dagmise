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

var atask;
dag.task('a', atask = function () {
	count.a++;
	return 'AAA';
});

var byield = { an: 'object' };

dag.task('b', 'a', function (target, a) {
	// console.log('b:', deps);
	count.b++;
	assert(target === 'b');
	assert(a === 'AAA');
	var delay = 200;
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve(byield);
		}, delay);
	});
});

dag.task('c', function () {
	count.c++;
	// console.log('c:', deps);
	return when.resolve(42);
});

dag.task('d', ['b', 'c'], function (t, b, c) {
	count.d++;
	// console.log('d:', t, b, c);
	assert(b === byield);
	assert(c === 42);
	var r = {};
	r[b.an] = c;
	return r;
});

assert.deepEqual(dag._nodes, dag._tasks);

dag.make('d').then(function (result) {
	assert.deepEqual(result, {object: 42});
	assert.deepEqual(count, { a: 1, b: 1, c: 1, d: 1 });

}).then(function (result) {
	// this second make does nothing, cause all things are built already.
	assert(when.isPromiseLike(dag.get('a')));
	assert(when.isPromiseLike(dag.get('d')));

	return dag.make('d').then(function (result) {
		assert.deepEqual(result, {object: 42});
		assert.deepEqual(count, { a: 1, b: 1, c: 1, d: 1 });

		assert(when.isPromiseLike(dag.get('a')));
		assert(when.isPromiseLike(dag.get('d')));

		dag.reset();

		assert(typeof dag.get('a') === 'function');
		assert(typeof dag.get('d') === 'function');
		
	});
}).then(function () {

	dag.edge('a', 'c');
	
	return dag.make('d').then(function (result) {
		assert.deepEqual(result, {object: 42});
		assert.deepEqual(count, { a: 2, b: 2, c: 2, d: 2 });

	});
}).then(function () {

	dag.update('b');

	return dag.make('d').then(function (result) {
		assert.deepEqual(result, {object: 42});
		assert.deepEqual(count, { a: 2, b: 3, c: 2, d: 3 });
	});
}).then(function () {
	return dag.run('c').then(function (result) {
		assert.deepEqual(result, 42);
		assert.deepEqual(count, { a: 2, b: 3, c: 2, d: 3 });
		assert(typeof dag.get('d') === 'function');
	});
});

assert(dag.reset() === false);